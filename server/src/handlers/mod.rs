use std::{collections::HashMap, str::FromStr, sync::Mutex, time::Instant};

use actix::{Actor, Addr};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Local, NaiveDateTime};
use delt_d::character::Character;
use diesel::{insert_into, prelude::*, update};
use uuid::Uuid;

use crate::{
    db::{
        get_account_id,
        models::{Game, NewSession, PlayerSession, Session, Whitelist},
        schema, DB,
    },
    handlers::{
        client::ClientActor,
        contract_methods::{DeltMethods, Res},
        global::GlobalActor,
        session::SessionActor,
    },
    types::{GameId, Lvl, PlayerInfo, PlayerStats, SessionState, SessionView, UserId},
};

use self::messages::*;

pub mod client;
pub mod contract_methods;
pub mod global;
pub mod messages;
pub mod session;

lazy_static::lazy_static! {
    pub static ref CLIENTS: Mutex<HashMap<UserId, Addr<ClientActor>>> = Mutex::new(HashMap::new());

    pub static ref SESSIONS: Mutex<HashMap<Uuid, Addr<SessionActor>>> = Mutex::new(HashMap::new());

    pub static ref GLOBAL: Addr<GlobalActor> = GlobalActor::default().start();
}

pub struct ClientInfo {
    pub started_at: NaiveDateTime,
    pub last_update: Instant,
    pub ms: Vec<u32>,
    pub actor: Addr<ClientActor>,
}

impl ClientInfo {
    pub fn new(actor: Addr<ClientActor>) -> Self {
        Self {
            started_at: Local::now().naive_local(),
            last_update: Instant::now(),
            ms: Vec::new(),
            actor,
        }
    }

    pub fn player_info(&self, id: &UserId, state: &SessionState) -> PlayerInfo {
        let mut sum: u32 = 0;
        for x in &self.ms {
            sum = sum + x;
        }

        PlayerInfo {
            managed_entities: state.entities.managed(id),
            ping: sum.checked_div(self.ms.len() as u32).unwrap_or(0),
            stats: state
                .stats
                .get(id)
                .unwrap_or(&PlayerStats::default())
                .to_owned(),
        }
    }
}

pub async fn create(
    game_id: GameId,
    user_id: UserId,
    mut password: Option<String>,
    whitelist: Option<Vec<UserId>>,
    state: SessionState,
) -> Result<Session, ServerError> {
    let mut db = DB.get();

    let conn = db.as_mut().unwrap();

    use schema::games::dsl::{ended_at, games, id as gid, result};

    match games
        .filter(
            gid.eq(&game_id)
                .and(ended_at.is_null())
                .and(result.is_null()),
        )
        .get_result::<Game>(conn)
    {
        Ok(game) if game.lvl_required > Lvl::default() || game.pool_id.is_some() => {
            match get_account_id(&user_id) {
                Ok(account_id) => {
                    let method = DeltMethods::Character(account_id);

                    match method.call().await {
                        Ok(Res::Character(Character { xp, .. }))
                            if Lvl::from_xp(xp) < game.lvl_required =>
                        {
                            return Err(ServerError::Restricted(
                                "level requirement not reached".to_string(),
                            ))
                        }

                        Err(e) => return Err(e),

                        _ => {}
                    }
                }

                Err(e) => return Err(e),
            };
        }

        Err(e) => return Err(ServerError::DbError(e.to_string())),

        _ => {}
    };

    use schema::sessions::dsl::sessions;

    password.as_mut().map(|raw| hash(raw, 10).unwrap());

    match insert_into(sessions)
        .values(NewSession {
            game_id,
            creator: user_id.to_owned(),
            password,
            private: whitelist.is_some(),
            state,
        })
        .get_result::<Session>(conn)
    {
        Ok(session) => {
            if let Some(wl) = whitelist {
                use schema::whitelist::dsl::whitelist;

                let whitelisted: Vec<Whitelist> = wl
                    .iter()
                    .map(|id| Whitelist {
                        user_id: id.to_owned(),
                        session_id: session.id.to_owned(),
                    })
                    .collect();

                match insert_into(whitelist).values(whitelisted).execute(conn) {
                    Ok(_) => {}

                    Err(e) => println!("Failed to create whitelist: {}", e.to_string()),
                }
            };

            println!("[Server] {:?} has created {}", &user_id, &session.id);

            Ok(session)
        }

        Err(e) => Err(ServerError::DbError(e.to_string())),
    }
}

pub async fn join(
    session_id: Uuid,
    user_id: UserId,
    password: Option<String>,
) -> Result<
    (
        (SessionState, HashMap<UserId, PlayerInfo>),
        Addr<SessionActor>,
    ),
    ServerError,
> {
    let mut db = DB.get();

    let conn = db.as_mut().unwrap();

    use schema::sessions::dsl::{id, sessions};

    use schema::games::dsl::games;

    match sessions
        .inner_join(games)
        .filter(id.eq(&session_id))
        .get_result::<(Session, Game)>(conn)
    {
        Ok((Session { ended_at, .. }, _)) if ended_at.is_some() => {
            Err(ServerError::Query("Session has ended".to_string()))
        }

        Ok((
            Session {
                creator,
                password: Some(ref password_hash),
                ..
            },
            _,
        )) if creator != user_id
            && !verify(password.unwrap_or_default(), password_hash).unwrap() =>
        {
            Err(ServerError::Query("Incorrect password entered".to_string()))
        }

        Ok((
            _,
            Game {
                ended_at, result, ..
            },
        )) if ended_at.is_some() || result.is_some() => Err(ServerError::Query(
            "Session is not accepting new players".to_string(),
        )),

        Ok((
            session,
            Game {
                lvl_required,
                pool_id,
                ..
            },
        )) => {
            if session.creator != user_id {
                if session.private {
                    use schema::whitelist::dsl::{session_id as wsid, whitelist};

                    match whitelist
                        .filter(wsid.eq(&session_id))
                        .get_results::<Whitelist>(conn)
                    {
                        Ok(wl)
                            if !wl
                                .iter()
                                .any(|Whitelist { user_id: wuid, .. }| wuid == &user_id) =>
                        {
                            return Err(ServerError::Restricted("Must be whitelisted".to_string()))
                        }

                        Err(e) => return Err(ServerError::DbError(e.to_string())),

                        _ => {}
                    };
                }

                if lvl_required > Lvl::default() || pool_id.is_some() {
                    match get_account_id(&user_id) {
                        Ok(account_id) => {
                            let method = DeltMethods::Character(account_id);

                            match method.call().await {
                                Ok(Res::Character(Character { xp, .. }))
                                    if Lvl::from_xp(xp) < lvl_required =>
                                {
                                    return Err(ServerError::Restricted(
                                        "xp requirement not reached".to_string(),
                                    ))
                                }

                                Err(e) => return Err(e),

                                _ => {}
                            }
                        }

                        Err(e) => return Err(e),
                    };
                }
            }

            use schema::player_sessions::dsl::{
                ended_at, player_sessions, session_id as id, started_at, user_id as uid,
            };

            let player_info = match player_sessions
                .filter(uid.eq(&user_id).and(id.eq(&session_id)))
                .order_by(started_at.desc())
                .get_result::<PlayerSession>(conn)
            {
                Ok(PlayerSession { info, .. }) => {
                    match update(
                        player_sessions.filter(
                            uid.eq(&user_id)
                                .and(id.eq(&session_id).and(ended_at.is_not_null())),
                        ),
                    )
                    .set(ended_at.eq(Local::now().naive_local()))
                    .execute(conn)
                    {
                        Ok(_) => {}

                        Err(_) => {}
                    }

                    info
                }

                Err(_) => PlayerInfo::default(),
            };

            let mut guard = SESSIONS.lock().unwrap();

            let session_actor = guard
                .entry(session_id.to_owned())
                .or_insert(SessionActor::new(session.to_owned(), user_id.to_owned()).start());

            let res = session_actor
                .send(Join {
                    user_id,
                    player_info,
                })
                .await
                .unwrap();

            Ok((res, session_actor.to_owned()))
        }

        Err(e) => Err(ServerError::DbError(e.to_string())),
    }
}

pub async fn get_sessions(
    user_id: UserId,
    session_id: Option<String>,
    game_id: Option<GameId>,
    host_id: Option<UserId>,
) -> Result<HashMap<Uuid, SessionView>, ServerError> {
    use schema::{games::dsl as gdsl, sessions::dsl as sdsl, whitelist::dsl as wdsl};

    let mut view = HashMap::new();

    match DB.get().as_mut() {
        Ok(conn) => {
            match gdsl::games
                .inner_join(sdsl::sessions)
                .filter(gdsl::ended_at.is_null().and(sdsl::ended_at.is_null()))
                .load::<(Game, Session)>(conn)
            {
                Ok(viewable_games) => {
                    for (game, session) in (viewable_games as Vec<(Game, Session)>).iter() {
                        let mut insertable = true;

                        if session.private && &session.creator != &user_id {
                            match wdsl::whitelist
                                .filter(wdsl::session_id.eq(&session.id))
                                .get_results::<Whitelist>(conn)
                            {
                                Ok(wl)
                                    if !wl.iter().any(|Whitelist { user_id: wuid, .. }| {
                                        wuid == &user_id
                                    }) => {}

                                _ => insertable = false,
                            }
                        };

                        if insertable {
                            if let Some(id) = &session_id {
                                match Uuid::from_str(id) {
                                    Ok(uuid) => {
                                        if session.id != uuid {
                                            insertable = false
                                        }
                                    }
                                    Err(_) => {
                                        if !&session.id.to_string().contains(id) {
                                            insertable = false
                                        }
                                    }
                                }
                            };

                            if let Some(id) = &game_id {
                                if !&game.id.to_string().contains(id) {
                                    insertable = false
                                }
                            };

                            if let Some(id) = &host_id {
                                if !&session.creator.to_string().contains(id) {
                                    insertable = false
                                }
                            };
                        };
                        if insertable {
                            view.insert(
                                session.id.to_owned(),
                                SessionView {
                                    started_at: session.started_at.to_owned(),
                                    game_id: game.id.to_owned(),
                                    created_at: game.created_at.to_owned(),
                                    creator: session.creator.to_owned(),
                                    players: get_players(&session.id).await,
                                    game_creator: game.creator.to_owned(),
                                    password: session.password.is_some(),
                                },
                            );
                        }
                    }

                    Ok(view)
                }

                Err(e) => Err(ServerError::DbError(e.to_string())),
            }
        }

        Err(e) => Err(ServerError::DbError(e.to_string())),
    }
}

pub async fn get_players(id: &Uuid) -> i32 {
    let active_sessions = SESSIONS.lock().unwrap();

    match active_sessions.get(id) {
        Some(actor) => actor.send(SessionQuery {}).await.unwrap().1.len() as i32,

        None => 0,
    }
}

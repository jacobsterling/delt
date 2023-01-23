use crate::{
    db::{
        models::{PlayerSession, Session},
        schema, DB,
    },
    handlers::GLOBAL,
    types::{Content, GameId, Logs, PlayerInfo, PlayerStats, SessionState, UserId},
};
use actix::{prelude::Actor, ActorContext, AsyncContext, Context, Handler, MessageResult};
use chrono::{Local, NaiveDateTime};
use diesel::{prelude::*, sql_types::Jsonb, update};
use near_primitives::types::AccountId;
use std::{
    collections::{HashMap, HashSet},
    str::FromStr,
    sync::Mutex,
    time::{Duration, Instant},
};
use uuid::Uuid;

use super::{messages::*, ClientInfo, CLIENTS, SESSIONS};

pub struct SessionActor {
    pub id: Uuid,
    pub game_id: GameId,
    pub host: UserId,
    pub clients: Mutex<HashMap<UserId, ClientInfo>>,
    pub pool_id: Option<String>,
    pub resolved: bool,
    pub state: Mutex<SessionState>,
    pub logger: Logs,
    pub tick: Instant,
}

const TICK_INTERVAL: Duration = Duration::from_millis(1000 / 60);
const LOG_INTERVAL: Duration = Duration::from_secs(10);

impl SessionActor {
    pub fn new(
        Session {
            id,
            game_id,
            state,
            logs,
            pool_id,
            ..
        }: Session,
        host: UserId,
    ) -> Self {
        Self {
            id,
            game_id,
            host,
            clients: Mutex::new(HashMap::new()),
            resolved: false,
            state: Mutex::new(state),
            logger: logs,
            tick: Instant::now(),
            pool_id,
        }
    }

    pub fn log(&self) {
        let mut db = DB.get();

        let conn = db.as_mut().unwrap();

        use schema::sessions::dsl::{id, last_update, logs, sessions, state};

        let session_state = self.state.lock().unwrap().to_owned();

        match update(sessions)
            .filter(id.eq(&self.id))
            .set((
                logs.eq(self.logger.as_sql::<Jsonb>()),
                state.eq(session_state.as_sql::<Jsonb>()),
                last_update.eq(Local::now().naive_local()),
            ))
            .execute(conn)
        {
            Ok(_) => {}

            Err(_) => {}
        }

        let clients = self.clients.lock().unwrap();

        use schema::player_sessions::dsl::{ended_at, info, player_sessions, session_id, user_id};

        for uid in clients.keys() {
            update(player_sessions)
                .filter(session_id.eq(&self.id).and(user_id.eq(uid)))
                .set((
                    info.eq(session_state.player_info(&uid)),
                    ended_at.eq(None::<NaiveDateTime>),
                ))
                .execute(conn)
                .ok();
        }
    }
}

impl Actor for SessionActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        ctx.run_interval(TICK_INTERVAL, |act, _| {
            let session_state = act.state.lock().unwrap();

            let clients = act.clients.lock().unwrap();

            let mut actors = Vec::new();

            let mut players = HashMap::new();

            for (id, client_info) in clients.iter() {
                actors.push(client_info.actor.to_owned());
                players.insert(id.to_owned(), session_state.player_info(&id));
            }

            let tick = ServerMessage::Tick {
                players,
                state: session_state.to_owned(),
                tick: Instant::now()
                    .duration_since(act.tick.to_owned())
                    .as_millis(),
            };

            for actor in actors {
                actor.do_send(tick.to_owned());
            }

            act.tick = Instant::now();

            // else if self.resolved {}
        });

        ctx.run_interval(LOG_INTERVAL, |act, _| act.log());
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        let mut session_guard = SESSIONS.lock().unwrap();

        session_guard.remove(&self.id);
    }
}

impl Handler<SessionEnd> for SessionActor {
    type Result = ();

    fn handle(&mut self, _: SessionEnd, _: &mut Context<Self>) {
        self.log();

        let clients = self.clients.lock().unwrap();

        let mut db = DB.get();

        let conn = db.as_mut().unwrap();

        let session_state = self.state.lock().unwrap().to_owned();

        use schema::player_sessions::dsl::{player_sessions, session_id};

        match player_sessions
            .filter(session_id.eq(&self.id))
            .get_results::<PlayerSession>(conn)
        {
            Ok(res) => {
                for PlayerSession {
                    user_id,
                    account_id,
                    ..
                } in res.iter()
                {
                    let PlayerStats {
                        kills,
                        xp_accrual,
                        death,
                    } = session_state.stats.get(user_id).unwrap();

                    if let Some(account_id) = match account_id {
                        Some(s) => AccountId::from_str(s).ok(),
                        None => None,
                    } {
                        let xp = match death {
                            Some(_) => None,
                            None => Some(xp_accrual),
                        };

                        GLOBAL.do_send(PlayerSessionResolve {
                            session_id: self.id.to_owned(),
                            account_id: account_id.to_owned(),
                            xp: xp.copied(),
                        });
                    }

                    if let Some(pool_id) = &self.pool_id {}
                }

                use schema::sessions::dsl::{ended_at, id, sessions};

                match update(sessions)
                    .filter(id.eq(&self.id))
                    .set(ended_at.eq(Local::now().naive_local()))
                    .execute(conn)
                {
                    Ok(_) => println!(),

                    Err(e) => println!(
                        "session_id: {}, failed to end. Error: {}",
                        &self.id,
                        e.to_string()
                    ),
                };
            }

            Err(e) => println!(
                "session_id: {}, failed to end. Error: {}",
                &self.id,
                e.to_string()
            ),
        }
    }
}

impl Handler<SessionMessage> for SessionActor {
    type Result = ();

    fn handle(&mut self, SessionMessage { msg, exclude }: SessionMessage, _: &mut Context<Self>) {
        for (id, client) in self.clients.lock().unwrap().iter() {
            if !exclude.contains(id) {
                client.actor.do_send(msg.to_owned());
            }
        }
        self.logger.log(&msg);
    }
}

impl Handler<Join> for SessionActor {
    type Result = MessageResult<Join>;

    fn handle(
        &mut self,
        Join {
            user_id,
            player_info,
            account_id,
        }: Join,
        ctx: &mut Context<Self>,
    ) -> Self::Result {
        let guard = CLIENTS.lock().unwrap();

        let client_actor = guard.get(&user_id).unwrap();

        let mut clients = self.clients.lock().unwrap();

        clients.insert(
            user_id.to_owned(),
            ClientInfo::new(client_actor.to_owned(), account_id),
        );

        let mut notif = Content::new();

        let msg = format!("{} joined.", &user_id);

        self.logger.log(&msg);

        notif.insert("message", &msg).insert("id", &user_id);

        ctx.notify(SessionMessage {
            msg: ServerMessage::Notification(notif),
            exclude: Vec::new(),
        });

        let mut players = HashMap::new();

        let mut session_state = self.state.lock().unwrap();

        session_state
            .entities
            .set_managed(&player_info.managed_entities, &user_id);

        for (id, _) in clients.iter() {
            players.insert(id.to_owned(), session_state.player_info(id));
        }

        println!("[Server] {:?} has joined {}", &user_id, &self.id);

        MessageResult((session_state.to_owned(), players))
    }
}

impl Handler<Leave> for SessionActor {
    type Result = MessageResult<Leave>;

    fn handle(&mut self, Leave(user_id): Leave, ctx: &mut Context<Self>) -> Self::Result {
        let mut clients = self.clients.lock().unwrap();

        match clients.remove(&user_id) {
            Some(_) => {
                let mut notif = Content::new();

                notif
                    .insert("id", &user_id)
                    .insert("message", &format!("{} left.", &user_id));

                let mut session_state = self.state.lock().unwrap();

                let mut managed_entites = session_state.entities.managed(&user_id);

                ctx.notify(SessionMessage {
                    msg: ServerMessage::Left {
                        user_id: user_id.to_owned(),
                        managed_entities: managed_entites.to_owned(),
                    },
                    exclude: vec![user_id.to_owned()],
                });

                println!("[Server] {:?} has left {}", &user_id, self.id.to_owned());

                match clients.iter().next() {
                    Some((new_manager, _)) => {
                        managed_entites = session_state.entities.managed(&user_id);

                        session_state
                            .entities
                            .set_managed(&managed_entites, new_manager);

                        if user_id == self.host {
                            self.host = new_manager.to_owned()
                        }
                    }

                    None => ctx.stop(),
                };

                MessageResult(Some((
                    self.id.to_owned(),
                    session_state.player_info(&user_id),
                )))
            }

            None => MessageResult(None),
        }
    }
}

impl Handler<SessionUpdate> for SessionActor {
    type Result = ();

    fn handle(&mut self, SessionUpdate { updater, update }: SessionUpdate, _: &mut Context<Self>) {
        let mut clients = self.clients.lock().unwrap();

        let updater_info = clients.get_mut(&updater).unwrap();

        updater_info.last_update = Instant::now();

        let mut session_state = self.state.lock().unwrap();

        let updater_managed_entities = session_state.entities.managed(&updater);

        match update {
            Update::Affect {
                affector,
                affected,
                affectors,
            } if updater_managed_entities.contains(&affector) => {
                for (id, ClientInfo { actor, .. }) in
                    clients.iter().filter(|(id, _)| *id != &updater)
                {
                    let mut affected_entities = HashSet::new();
                    for entity_id in &affected {
                        if session_state.entities.managed(id).contains(entity_id) {
                            affected_entities.insert(entity_id.to_owned());
                        }
                    }
                    actor.do_send(ServerMessage::Update(Update::Affect {
                        affector: affector.to_owned(),
                        affectors: affectors.to_owned(),
                        affected: affected_entities,
                    }))
                }
            }

            Update::ChangeSpawn(spawn) if updater == self.host => session_state.spawn = spawn,

            Update::Entities {
                active,
                kill_list,
                spawns,
            } => {
                for (id, entity) in active.0.iter() {
                    if updater_managed_entities.contains(id) {
                        session_state
                            .entities
                            .update(id.to_owned(), entity.to_owned());

                        session_state.pending_spawns.remove(id);
                    }
                }

                for id in kill_list.iter() {
                    if updater_managed_entities.contains(id) {
                        if let Some(entity) = session_state.entities.remove(id) {
                            session_state.destroyed_entities.insert(id, entity);
                        }
                    }
                }

                for (id, entity) in spawns.0.iter() {
                    if !session_state.pending_spawns.contains_key(id) {
                        let new_id = session_state.entities.insert(id, entity.to_owned());

                        session_state.pending_spawns.insert(id.to_owned(), new_id);
                    }
                }
            }

            Update::Stats(stats) => {
                session_state.stats.insert(updater, stats);
            }

            _ => {}
        };
    }
}

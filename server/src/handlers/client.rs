use crate::{
    db::{
        models::{PlayerSession, Session},
        schema, DB,
    },
    handlers::{CLIENTS, SESSIONS},
    types::UserId,
};
use actix::{
    Actor, ActorContext, ActorFutureExt, Addr, AsyncContext, Handler, SpawnHandle, StreamHandler,
    WrapFuture,
};
use actix_web_actors::ws;
use chrono::Local;

use diesel::{prelude::*, update};
use near_primitives::types::AccountId;
use serde_json::from_str;
use std::{
    str::FromStr,
    time::{Duration, Instant},
};
use uuid::Uuid;

use super::{messages::*, session::SessionActor};

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(1);
const TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone)]
pub struct ClientActor {
    pub id: UserId,
    pub session: Option<Addr<SessionActor>>,
    hb: Instant,
    hb_handle: Option<SpawnHandle>,
}

impl Handler<ServerMessage> for ClientActor {
    type Result = ();

    fn handle(&mut self, msg: ServerMessage, ctx: &mut Self::Context) {
        ctx.text(msg.to_message());
    }
}

impl Handler<ServerError> for ClientActor {
    type Result = ();

    fn handle(&mut self, msg: ServerError, ctx: &mut Self::Context) {
        ctx.text(msg.to_message());
    }
}

fn heartbeat(ctx: &mut ws::WebsocketContext<ClientActor>) -> SpawnHandle {
    ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
        let elapsed = act.hb.elapsed().as_secs();
        if elapsed > TIMEOUT.as_secs() {
            ctx.stop();
            return;
        }
    })
}

impl ClientActor {
    pub fn new(id: UserId) -> Self {
        Self {
            id,
            session: None,
            hb: Instant::now(),
            hb_handle: None,
        }
    }

    fn leave(&mut self, ctx: &mut ws::WebsocketContext<Self>) {
        if let Some(session) = self.session.take() {
            let msg = Leave(self.id.to_owned());

            ctx.spawn(
                async move { session.send(msg).await.unwrap() }
                    .into_actor(self)
                    .map(|res, act, ctx| match res {
                        Some((id, player_info)) => {
                            use schema::player_sessions::dsl::{
                                ended_at, info, player_sessions, session_id, user_id,
                            };

                            let mut db = DB.get();

                            let conn = db.as_mut().unwrap();

                            match update(player_sessions)
                                .filter(user_id.eq(&act.id).and(session_id.eq(id)))
                                .set((
                                    ended_at.eq(Local::now().naive_local()),
                                    info.eq(&player_info),
                                ))
                                .execute(conn)
                            {
                                Ok(_) => ctx.notify(ServerMessage::Left {
                                    user_id: act.id.to_owned(),
                                    managed_entities: player_info.managed_entities,
                                }),

                                Err(e) => ctx.notify(ServerError::Database(e)),
                            };
                        }
                        None => {}
                    }),
            );
        }
    }

    fn join(&mut self, session_id: Uuid, ctx: &mut ws::WebsocketContext<Self>) {
        use schema::player_sessions::dsl::{player_sessions, user_id};
        use schema::sessions::dsl::{id, sessions};

        let mut db = DB.get();

        let conn = db.as_mut().unwrap();

        match player_sessions
            .inner_join(sessions)
            .filter(id.eq(&session_id).and(user_id.eq(&self.id)))
            .get_result::<(PlayerSession, Session)>(conn)
        {
            Ok((
                PlayerSession {
                    info, account_id, ..
                },
                session,
            )) => {
                let mut guard = SESSIONS.lock().unwrap();

                let session_actor = guard
                    .entry(session.id.to_owned())
                    .or_insert(SessionActor::new(session, self.id.to_owned()).start())
                    .to_owned();

                let msg = session_actor.send(Join {
                    user_id: self.id.to_owned(),
                    player_info: info.unwrap_or_default(),
                    account_id: match account_id {
                        Some(s) => AccountId::from_str(&s).ok(),

                        None => None,
                    },
                });

                ctx.spawn(async move { msg.await.unwrap() }.into_actor(self).map(
                    move |(state, players), act, ctx| {
                        act.hb_handle = Some(heartbeat(ctx));
                        act.session = Some(session_actor);

                        println!("[Server] {:?} has joined {}", &act.id, &session_id);

                        ctx.notify(ServerMessage::Joined {
                            session_id,
                            state: state.to_owned(),
                            players: players.to_owned(),
                        });
                    },
                ));
            }

            Err(e) => {
                ctx.notify(ServerError::Database(e));
            }
        };
    }
}

impl Actor for ClientActor {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        if let Some(existing) = CLIENTS
            .lock()
            .unwrap()
            .insert(self.id.to_owned(), ctx.address())
        {
            existing.do_send(ServerMessage::Disconnected);
        }

        use schema::player_sessions::dsl::{ended_at, player_sessions, user_id};
        use schema::sessions::dsl::{ended_at as session_ended_at, id, sessions};

        let mut db = DB.get();

        let conn = db.as_mut().unwrap();

        match player_sessions
            .inner_join(sessions)
            .filter(
                user_id
                    .eq(&self.id)
                    .and(session_ended_at.is_not_null())
                    .and(ended_at.is_not_null()),
            )
            .select(id)
            .get_result::<Uuid>(conn)
        {
            Ok(session_id) => {
                self.join(session_id, ctx);
            }

            Err(_) => {
                ctx.notify(ServerMessage::Connected);
            }
        };
    }

    fn stopping(&mut self, ctx: &mut Self::Context) -> actix::Running {
        self.leave(ctx);

        ctx.notify(ServerMessage::Disconnected);

        CLIENTS.lock().unwrap().remove(&self.id);

        actix::Running::Stop
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        println!("[Server] {:?} has left", &self.id);
    }
}

/// Handler for ws::Message message
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for ClientActor {
    fn handle(&mut self, raw_msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match raw_msg {
            Err(_) => {
                ctx.stop();
                return;
            }

            Ok(res) => match res {
                ws::Message::Ping(msg) => {
                    self.hb = Instant::now();
                    ctx.pong(&msg)
                }
                ws::Message::Pong(_) => {
                    self.hb = Instant::now();
                }
                ws::Message::Text(text) => {
                    self.hb = Instant::now();

                    match from_str::<ClientMessage>(text.trim()) {
                        Ok(msg) => match msg {
                            ClientMessage::Update(update) => match &self.session {
                                Some(game) => game.do_send(SessionUpdate {
                                    updater: self.id.to_owned(),
                                    update,
                                }),

                                None => ctx.notify(ServerError::new(
                                    std::io::ErrorKind::PermissionDenied,
                                    "Must be connected to a game to send updates",
                                )),
                            },

                            ClientMessage::Join { session_id } => {
                                self.join(session_id, ctx);
                            }

                            ClientMessage::Leave => self.leave(ctx),

                            ClientMessage::Message { msg, reciptiants } => {
                                let guard = CLIENTS.lock().unwrap();

                                let message = ServerMessage::Message {
                                    msg,
                                    sender: self.id.to_owned(),
                                };

                                if reciptiants.len() > 0 {
                                    for recipient in reciptiants {
                                        match guard.get(&recipient) {
                                            Some(actor) => actor.do_send(message.to_owned()),

                                            None => ctx.notify(ServerError::Query(
                                                "account id does not exist".to_string(),
                                            )),
                                        }
                                    }
                                } else if let Some(session) = &self.session {
                                    session.do_send(SessionMessage {
                                        msg: message,
                                        exclude: vec![self.id.to_owned()],
                                    })
                                };
                            }
                        },
                        Err(e) => ctx.notify(ServerError::Serde(e)),
                    }
                }
                ws::Message::Binary(_) => {
                    println!("Unexpected binary");
                }
                ws::Message::Close(reason) => {
                    ctx.close(reason);
                    ctx.stop();
                }
                ws::Message::Continuation(_) => {
                    ctx.stop();
                }
                ws::Message::Nop => (),
            },
        };
    }
}

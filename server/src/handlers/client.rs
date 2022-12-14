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
use serde_json::from_str;
use std::time::{Duration, Instant};

use super::{create, get_sessions, join, messages::*, session::SessionActor};

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(1);
const TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone)]
pub struct ClientActor {
    pub id: UserId,
    auth: String,
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

impl Handler<SessionEnded> for ClientActor {
    type Result = ();

    fn handle(&mut self, SessionEnded(session_id): SessionEnded, ctx: &mut Self::Context) {
        use schema::player_sessions::dsl::{ended_at, player_sessions, session_id as id, user_id};

        let mut db = DB.get();

        let conn = db.as_mut().unwrap();

        match update(player_sessions)
            .filter(
                user_id
                    .eq(&self.id)
                    .and(id.eq(&session_id))
                    .and(ended_at.is_not_null()),
            )
            .set(ended_at.eq(Local::now().naive_local()))
            .execute(conn)
        {
            Ok(_) => {}

            Err(e) => ctx.notify(ServerError::DbError(e.to_string())),
        };

        self.session = None;

        ctx.notify(ServerMessage::Ended { session_id });
    }
}

impl ClientActor {
    pub fn new(id: UserId, auth: String) -> Self {
        Self {
            id,
            auth,
            session: None,
            hb: Instant::now(),
            hb_handle: None,
        }
    }

    fn heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) -> SpawnHandle {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            let elapsed = act.hb.elapsed().as_secs();
            if elapsed > TIMEOUT.as_secs() {
                ctx.stop();
                return;
            }
        })
    }
}

impl Actor for ClientActor {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        CLIENTS
            .lock()
            .unwrap()
            .entry(self.id.to_owned())
            .and_modify(|addr| ctx.stop())
            .or_insert(ctx.address());

        use schema::player_sessions::dsl::{ended_at, player_sessions, user_id as id};
        use schema::sessions::dsl::{ended_at as session_ended_at, sessions};

        let mut db = DB.get();

        let conn = db.as_mut().unwrap();

        let user_id = self.id.to_owned();

        match player_sessions
            .inner_join(sessions)
            .filter(
                id.eq(&user_id)
                    .and(session_ended_at.is_not_null())
                    .and(ended_at.is_not_null()),
            )
            .get_result::<(PlayerSession, Session)>(conn)
        {
            Ok((
                PlayerSession {
                    info, session_id, ..
                },
                previous_session,
            )) => {
                let mut guard = SESSIONS.lock().unwrap();

                let session_actor = guard
                    .entry(session_id)
                    .or_insert(SessionActor::new(previous_session, user_id.to_owned()).start())
                    .to_owned();

                ctx.spawn(
                    async move {
                        let res = session_actor
                            .send(Join {
                                user_id,
                                player_info: info,
                            })
                            .await
                            .unwrap();

                        (session_actor, res)
                    }
                    .into_actor(self)
                    .map(move |(actor, (state, players)), act, ctx| {
                        act.hb_handle = Some(act.heartbeat(ctx));
                        act.session = Some(actor);

                        println!("[Server] {:?} has rejoined {}", &act.id, &session_id);

                        ctx.notify(ServerMessage::Joined {
                            session_id,
                            state,
                            players,
                        });
                    }),
                );
            }

            Err(_) => ctx.notify(ServerMessage::Connected),
        };
    }

    fn stopping(&mut self, ctx: &mut Self::Context) -> actix::Running {
        if let Some(session_actor) = &self.session {
            session_actor.do_send(Leave(self.id.to_owned()));
        }

        ctx.notify(ServerMessage::Disconnected);

        CLIENTS.lock().unwrap().remove(&self.id);

        actix::Running::Stop
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        use schema::user_sessions::dsl::{auth_token, connection_ended_at, user_id, user_sessions};

        match DB.get().as_mut() {
            Ok(conn) => match update(user_sessions)
                .filter(
                    auth_token
                        .eq(&self.auth)
                        .and(user_id.eq(&self.id))
                        .and(connection_ended_at.is_not_null()),
                )
                .set(connection_ended_at.eq(Local::now().naive_local()))
                .execute(conn)
            {
                _ => {}
            },

            _ => {}
        }

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
                    match from_str::<ClientMessage>(text.trim()) {
                        Ok(msg) => match msg {
                            ClientMessage::Update(update) => match &self.session {
                                Some(game) => game.do_send(SessionUpdate {
                                    updater: self.id.to_owned(),
                                    update,
                                }),

                                None => ctx.notify(ServerError::Restricted(
                                    "Must be connected to a game to send updates".to_string(),
                                )),
                            },

                            ClientMessage::Create {
                                game_id,
                                password,
                                whitelist,
                                state,
                            } => {
                                ctx.spawn(
                                    create(
                                        game_id.to_owned(),
                                        self.id.to_owned(),
                                        password,
                                        whitelist,
                                        state,
                                    )
                                    .into_actor(self)
                                    .map(move |res, _, ctx| match res {
                                        Ok(Session { id, game_id, .. }) => {
                                            ctx.notify(ServerMessage::Created {
                                                session_id: id,
                                                game_id,
                                            });
                                        }

                                        Err(e) => ctx.notify(e),
                                    }),
                                );
                            }

                            ClientMessage::Join {
                                session_id,
                                password,
                            } => {
                                let user_id = self.id.to_owned();

                                ctx.spawn(
                                    join(session_id, user_id, password).into_actor(self).map(
                                        move |res, act, ctx| {
                                            match res {
                                                Ok(((state, players), game_actor)) => {
                                                    act.hb_handle = Some(act.heartbeat(ctx));
                                                    act.session = Some(game_actor);

                                                    ctx.notify(ServerMessage::Joined {
                                                        session_id,
                                                        state,
                                                        players,
                                                    })
                                                }

                                                Err(e) => ctx.notify(e),
                                            };
                                        },
                                    ),
                                );
                            }

                            ClientMessage::Leave => {
                                if let Some(session) = self.session.take() {
                                    session.do_send(Leave(self.id.to_owned()));
                                }
                            }

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

                            ClientMessage::Sessions {
                                session_id,
                                game_id,
                                host_id,
                            } => {
                                let user_id = self.id.to_owned();

                                ctx.spawn(
                                    get_sessions(user_id, session_id, game_id, host_id)
                                        .into_actor(self)
                                        .map(move |res, _, ctx| match res {
                                            Ok(sessions) => {
                                                ctx.notify(ServerMessage::Sessions(sessions))
                                            }

                                            Err(e) => ctx.notify(e),
                                        }),
                                );
                            }
                        },
                        Err(error) => {
                            ctx.notify(ServerError::UnexpectedResponse(error.to_string()))
                        }
                    }
                    self.hb = Instant::now();
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

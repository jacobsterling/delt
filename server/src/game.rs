use crate::{lobby::Lobby, messages::*, ws::HTTPActor};
use actix::{prelude::Actor, Addr, AsyncContext, Context, Handler, SpawnHandle};
use cgmath::num_traits::ToPrimitive;
use near_sdk::AccountId;
use serde_json::{Map, Value};
use std::{
    collections::HashMap,
    sync::Mutex,
    time::{Duration, Instant},
};
use uuid::Uuid;

const TICK_INTERVAL: Duration = Duration::from_millis(1000 / 60);

pub type GameId = String;

pub struct Game {
    pub id: GameId,
    pub host: Uuid,
    pub lobby: Addr<Lobby>,
    pub players: Mutex<HashMap<Uuid, Player>>, //for faster updates in tick fuction
    pub resolved: bool,                        //for contract interactions
    pub privite: bool,
    pub password: Option<String>,
    pub whitelist: Vec<AccountId>, //for privite servers / invite only (stake pools)
    pub data: Mutex<GameData>,
    pub t: Instant,
    pub tick_handle: Option<SpawnHandle>, //tick
}

pub struct GameData {
    pub entities: Map<String, Value>,
    pub game_state: Map<String, Value>,
}

#[derive(Debug)]
pub struct Player {
    // other info ?
    pub socket: Addr<HTTPActor>,
    pub account_id: AccountId,
    pub data: Map<String, Value>,
}

impl Player {
    pub fn new(socket: Addr<HTTPActor>, account_id: AccountId, data: Map<String, Value>) -> Self {
        Self {
            socket,
            account_id,
            data,
        }
    }
}

impl Actor for Game {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        self.tick_handle = Some(self.tick(ctx)); //lobby tick
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        self.tick_handle = None;
    }
}

impl Game {
    fn tick(&self, ctx: &mut Context<Self>) -> SpawnHandle {
        ctx.run_interval(TICK_INTERVAL, |act, ctx| {
            let mut update = Map::new();

            let game_guard = act.data.lock().unwrap();

            update.insert(
                "game_state".to_string(),
                Value::Object(game_guard.game_state.to_owned()),
            );

            //everything other than players
            update.insert(
                "entities".to_string(),
                Value::Object(game_guard.entities.to_owned()),
            );

            let dt = Instant::now()
                .duration_since(act.t.to_owned())
                .as_millis()
                .to_u64()
                .unwrap();

            update.insert("tick".to_string(), Value::Number(dt.into()));

            let player_guard = act.players.lock().unwrap();

            let mut players = Map::new();

            for (uid, player) in player_guard.iter() {
                players.insert(uid.to_string(), Value::Object(player.data.to_owned()));
            }

            update.insert("players".to_string(), Value::Object(players));

            ctx.address().do_send(GameMessage {
                id: act.host.to_owned(),
                msg: construct_msg("update", None, Some(update)),
                exclude: Vec::new(),
            });

            act.t = Instant::now();
        })
    }

    pub fn new(msg: Create, lobby: Addr<Lobby>) -> Self {
        Self {
            lobby,
            host: msg.id,
            id: msg.game_id,
            whitelist: msg.whitelist,
            privite: msg.privite,
            password: msg.password,
            resolved: true, //should be false by default  once contract interactions in place
            t: Instant::now(),
            tick_handle: None,
            players: Mutex::new(HashMap::new()),
            data: Mutex::new(GameData {
                game_state: msg.data,
                entities: Map::new(),
            }),
        }
    }
}

impl Handler<GameMessage> for Game {
    type Result = ();

    fn handle(&mut self, msg: GameMessage, _: &mut Context<Self>) {
        for (uid, player) in self.players.lock().unwrap().iter() {
            if !msg.exclude.contains(uid) {
                player.socket.do_send(msg.msg.to_owned());
            }
        }
    }
}

impl Handler<SetHost> for Game {
    type Result = ();

    fn handle(&mut self, msg: SetHost, _: &mut Context<Self>) {
        self.host = msg.host
    }
}

impl Handler<Migrate> for Game {
    type Result = ();

    fn handle(&mut self, mut msg: Migrate, _: &mut Context<Self>) {
        let guard = self.players.lock().unwrap();

        let other_players: Vec<Uuid> = guard
            .keys()
            .into_iter()
            .filter(|uid| *uid != &msg.host)
            .copied()
            .collect();

        msg.potential_hosts = other_players;
        msg.host = self.host.to_owned();

        self.lobby.do_send(msg);
    }
}

impl Handler<Join> for Game {
    type Result = ();

    fn handle(&mut self, mut msg: Join, ctx: &mut Context<Self>) {
        let mut error_msg: Option<String> = None;

        if msg.password != self.password {
            error_msg = Some("Incorrect password".to_string())
        }

        if self.whitelist.len() > 1 {
            if !self.whitelist.contains(msg.account_id.as_ref().unwrap()) && self.host != msg.id {
                error_msg = Some("Must be white listed to join this server".to_string())
            }
        }

        if error_msg.is_none() {
            msg.data
                .insert("name".to_string(), Value::String(msg.id.to_string()));

            let mut players = self.players.lock().unwrap();

            players.insert(
                msg.id.to_owned(),
                Player::new(
                    msg.socket.to_owned(),
                    msg.account_id.as_ref().unwrap().to_owned(),
                    msg.data.to_owned(),
                ),
            );

            let mut msg_content = Map::new();

            msg_content.insert(
                "game_id".to_string(),
                Value::String(msg.game_id.to_string()),
            );

            msg_content.insert("host_id".to_string(), Value::String(self.host.to_string()));

            msg_content.insert(
                "player_data".to_string(),
                Value::Object(msg.data.to_owned()),
            );

            ctx.address().do_send(GameMessage {
                id: self.host.to_owned(),
                msg: construct_msg(
                    "notification",
                    Some(format!(
                        "{} joined.",
                        msg.account_id.as_ref().unwrap().to_owned()
                    )),
                    Some(msg_content.to_owned()),
                ),
                exclude: Vec::new(),
            });

            self.lobby.do_send(Joined {
                game: ctx.address(),
                entry: msg.to_owned(),
            });
        }
    }
}

impl Handler<Leave> for Game {
    type Result = ();

    fn handle(&mut self, msg: Leave, ctx: &mut Context<Self>) {
        let mut guard = self.players.lock().unwrap();

        if let Some(client) = guard.remove(&msg.id) {
            if guard.len() > 0 {
                if msg.id == self.host {
                    //changes host
                    self.lobby.do_send(SetHost {
                        host: msg.id.to_owned(),
                        game: None,
                    });
                }

                let mut msg_content = Map::new();

                msg_content.insert("id".to_string(), Value::String(msg.id.to_string()));

                ctx.address().do_send(GameMessage {
                    id: self.host.to_owned(),
                    msg: construct_msg(
                        "left",
                        Some(format!("{} left.", client.account_id)),
                        Some(msg_content),
                    ),
                    exclude: vec![msg.id.to_owned()],
                });
            } else {
                //always true for now
                if self.resolved {
                    self.lobby.do_send(End {
                        id: self.host.to_owned(),
                        game_id: self.id.to_owned(),
                    })
                }
            }

            println!("[Server] {:?} has left {}", &msg.id, self.id.to_owned());

            if let Some(join) = msg.rejoin {
                ctx.address().do_send(join)
            } else {
                self.lobby.do_send(Left {
                    id: msg.id.to_owned(),
                    game_id: self.id.to_owned(),
                    rejoin: Join {
                        id: msg.id,
                        socket: client.socket,
                        game_id: self.id.to_owned(),
                        account_id: Some(client.account_id),
                        password: self.password.to_owned(),
                        data: client.data,
                    },
                })
            }
        };
    }
}

impl Handler<End> for Game {
    type Result = ();

    fn handle(&mut self, msg: End, ctx: &mut Context<Self>) {
        if msg.id == self.host && msg.game_id == self.id {
            let guard = self.players.lock().unwrap();

            for (uid, client) in guard.iter() {
                self.lobby.do_send(Left {
                    id: *uid,
                    game_id: msg.game_id.to_string(),
                    rejoin: Join {
                        id: msg.id,
                        socket: client.socket.to_owned(),
                        game_id: self.id.to_owned(),
                        account_id: Some(client.account_id.to_owned()),
                        password: self.password.to_owned(),
                        data: client.data.to_owned(),
                    },
                });
            }

            let mut msg_content = Map::new();

            msg_content.insert(
                "game_id".to_string(),
                Value::String(msg.game_id.to_string()),
            );

            ctx.address().do_send(GameMessage {
                id: self.host.to_owned(),
                msg: construct_msg("ended", None, None),
                exclude: Vec::new(),
            });

            if let Some(handle) = self.tick_handle {
                ctx.cancel_future(handle);
            }
        }
    }
}

impl Handler<Info> for Game {
    type Result = ();

    fn handle(&mut self, mut msg: Info, _: &mut Context<Self>) {
        let access = if self.privite {
            if msg.id != self.host {
                if let Some(acc_id) = &msg.account_id {
                    if self.whitelist.contains(&acc_id) {
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            } else {
                true
            }
        } else {
            true
        };

        if access {
            //other game info ??

            let mut players: Vec<Value> = Vec::new();

            let guard = self.players.lock().unwrap();

            for (_, player) in guard.iter() {
                players.push(Value::String(player.account_id.to_string()));
            }

            msg.info
                .insert("host_id".to_string(), Value::String(self.host.to_string()));

            msg.info
                .insert("players".to_string(), Value::Array(players));

            msg.info
                .insert("game_id".to_string(), Value::String(self.id.to_string()));

            if self.password.is_some() {
                msg.info
                    .insert("password_protected".to_string(), Value::Bool(true));
            } else {
                msg.info
                    .insert("password_protected".to_string(), Value::Bool(false));
            }

            self.lobby.do_send(msg);
        }
    }
}

impl Handler<Update> for Game {
    type Result = ();

    fn handle(&mut self, msg: Update, _: &mut Context<Self>) {
        let mut error_msg: Option<String> = None;

        let mut guard = self.data.lock().unwrap();

        for (key, value) in msg.obj.iter() {
            match key.as_str() {
                "msg_type" => {
                    //already know is "update"
                }

                "game_state" => {
                    //updates game state (map data, mobs etc)
                    if msg.id == self.host {
                        if let Some(new_data) = value.as_object() {
                            for (k, v) in new_data.iter() {
                                guard.game_state.insert(k.to_string(), v.to_owned());
                            }
                        } else {
                            error_msg = Some(format!("Expected object for data field"))
                        }
                    }
                }

                "entities" => {
                    if let Some(entity_data) = value.as_object() {
                        //prob not neccessary to get old position now but may need in future
                        guard
                            .entities
                            .insert(msg.id.to_string(), Value::Object(entity_data.to_owned()));
                    } else {
                        error_msg = Some(format!("Expected object for entity data"))
                    }
                }

                "self" => {
                    let mut player_guard = self.players.lock().unwrap();

                    if let Some(new_player_data) = value.as_object() {
                        //prob not neccessary to get old position now but may need in future

                        if let Some(player) = player_guard.get_mut(&msg.id) {
                            for (k, v) in new_player_data.iter() {
                                player.data.insert(k.to_string(), v.to_owned());
                            }
                        }
                    } else {
                        error_msg = Some(format!("Expected object for player data"))
                    }
                }

                _ => {}
            }
        }

        if error_msg.is_some() {
            self.players
                .lock()
                .unwrap()
                .get(&msg.id)
                .unwrap()
                .socket
                .do_send(construct_msg("error", error_msg, None))
        };
    }
}

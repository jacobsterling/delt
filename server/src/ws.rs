use crate::{messages::*, LOBBY};
use actix::{Actor, ActorContext, AsyncContext, Handler, SpawnHandle, StreamHandler};
use actix_web_actors::ws;
use near_sdk::AccountId;
use serde_json::{from_str, Map, Value};
use std::time::{Duration, Instant};
use uuid::Uuid;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(1);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// Define HTTP actor
pub struct HTTPActor {
    id: Uuid,
    hb: Instant,
    hb_handle: Option<SpawnHandle>,
}

impl Handler<PlayerMessage> for HTTPActor {
    type Result = ();

    fn handle(&mut self, msg: PlayerMessage, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}

impl Handler<Left> for HTTPActor {
    type Result = ();

    fn handle(&mut self, msg: Left, ctx: &mut Self::Context) {
        ctx.cancel_future(self.hb_handle.unwrap());
        self.hb_handle = None;

        let mut msg_content = Map::new();

        msg_content.insert(
            "game_id".to_string(),
            Value::String(msg.game_id.to_string()),
        );

        msg_content.insert("id".to_string(), Value::String(msg.id.to_string()));

        ctx.address()
            .do_send(construct_msg("left", None, Some(msg_content)));
    }
}

impl Handler<Joined> for HTTPActor {
    type Result = ();

    fn handle(&mut self, msg: Joined, ctx: &mut Self::Context) {
        self.hb_handle = Some(self.heartbeat(ctx));

        let mut msg_content = Map::new();

        msg_content.insert(
            "game_id".to_string(),
            Value::String(msg.entry.game_id.to_string()),
        );

        msg_content.insert("id".to_string(), Value::String(msg.entry.id.to_string()));

        ctx.address().do_send(construct_msg(
            "joined",
            Some(format!("joined {}.", msg.entry.game_id.to_string())),
            Some(msg_content),
        ));

        println!("{} joined {}", self.id, msg.entry.game_id);
    }
}

impl Handler<Register> for HTTPActor {
    type Result = ();
    fn handle(&mut self, msg: Register, ctx: &mut Self::Context) {
        let mut message: Option<String> = None;

        if self.id != msg.id {
            self.id = msg.id;
            message = Some(format!("Previous session restored."))
        }

        let mut msg_content = Map::new();

        msg_content.insert("id".to_string(), Value::String(self.id.to_string()));

        msg_content.insert(
            "account_id".to_string(),
            Value::String(msg.account_id.to_string()),
        );

        ctx.address()
            .do_send(construct_msg("registered", message, Some(msg_content)));
    }
}

impl HTTPActor {
    pub fn new() -> Self {
        Self {
            id: Uuid::new_v4(),
            hb: Instant::now(),
            hb_handle: None,
        }
    }

    fn heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) -> SpawnHandle {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            let elapsed = act.hb.elapsed().as_secs();
            if elapsed > CLIENT_TIMEOUT.as_secs() {
                println!("Disconnecting failed heartbeat");
                LOBBY.do_send(Disconnect { id: act.id });
                ctx.stop();
                return;
            }
        })
    }
}

impl Actor for HTTPActor {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        LOBBY.do_send(Connect {
            id: self.id,
            addr: ctx.address(),
        });
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        LOBBY.do_send(Disconnect { id: self.id });
    }
}

/// Handler for ws::Message message
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for HTTPActor {
    fn handle(&mut self, raw_msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        let msg = match raw_msg {
            Err(_) => {
                ctx.stop();
                return;
            }
            Ok(msg) => msg,
        };

        match msg {
            ws::Message::Ping(msg) => {
                self.hb = Instant::now();
                ctx.pong(&msg)
            }
            ws::Message::Pong(_) => {
                self.hb = Instant::now();
            }
            ws::Message::Text(text) => {
                let m = text.trim();

                let json: Result<Map<String, Value>, serde_json::Error> = from_str(&m);
                match json {
                    Ok(obj) => {
                        if let Some(msg_type) = obj.get("msg_type") {
                            match msg_type.as_str().unwrap() {
                                "update" => {
                                    LOBBY.do_send(Update { id: self.id, obj });
                                }

                                "register" => {
                                    let mut account_id: Option<AccountId> = None;

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "account_id" => {
                                                if let Ok(acc_id) = AccountId::try_from(
                                                    val.as_str().unwrap().to_string(),
                                                ) {
                                                    account_id = Some(acc_id)
                                                } else {
                                                    error_msg = Some(
                                                        "Enter Valid NEAR account id".to_string(),
                                                    )
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    if account_id.is_none() {
                                        error_msg = Some("Account id is required".to_string());
                                    }

                                    if error_msg.is_some() {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    } else {
                                        LOBBY.do_send(Register {
                                            id: self.id,
                                            account_id: account_id.unwrap(),
                                            join: None,
                                        });
                                    }
                                }

                                "create" => {
                                    let mut game_id: Option<String> = None;
                                    let mut password: Option<String> = None;
                                    let mut privite: bool = false;
                                    let mut whitelist: Vec<AccountId> = Vec::new();
                                    let mut data = Map::new();

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "game_id" => {
                                                if let Some(id) = val.as_str() {
                                                    game_id = Some(id.to_string());
                                                }
                                            }

                                            "whitelist" => {
                                                if let Some(list) = val.as_array() {
                                                    for id in list {
                                                        if let Ok(acc_id) = AccountId::try_from(
                                                            id.as_str().unwrap().to_string(),
                                                        ) {
                                                            whitelist.push(acc_id)
                                                        } else {
                                                            error_msg = Some(format!(
                                                                "Invalid account id: {:?}",
                                                                id
                                                            ))
                                                        };
                                                    }
                                                } else {
                                                    error_msg = Some("Whitelist only accepts array of account ids".to_string())
                                                }
                                            }

                                            "privite" => {
                                                if let Some(v) = val.as_bool() {
                                                    privite = v;
                                                } else {
                                                    error_msg = Some("Privite field only accepts a boolean value".to_string())
                                                }
                                            }

                                            "password" => {
                                                if let Some(pwrd) = val.as_str() {
                                                    password = Some(pwrd.to_string());
                                                } else {
                                                    //is there a password value thing in rust ???

                                                    error_msg = Some("Password field only accepts a string value".to_string())
                                                };
                                            }

                                            "data" => {
                                                if let Some(json) = val.as_object() {
                                                    for (key, value) in json.iter() {
                                                        data.insert(
                                                            key.to_string(),
                                                            value.to_owned(),
                                                        );
                                                    }
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    if game_id.is_none() {
                                        game_id = Some(Uuid::new_v4().to_string());
                                    }

                                    if error_msg.is_some() {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    } else {
                                        LOBBY.do_send(Create {
                                            id: self.id,
                                            privite,
                                            password,
                                            whitelist,
                                            data,
                                            game_id: game_id.unwrap(),
                                        });
                                    }
                                }

                                "affect" => {
                                    let mut affector: Option<String> = None;
                                    let mut affected: Option<String> = None;

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "affector_id" => {
                                                if let Some(id) = val.as_str() {
                                                    affector = Some(id.to_string())
                                                }
                                            }

                                            "affected_id" => {
                                                if let Some(id) = val.as_str() {
                                                    affected = Some(id.to_string())
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    if affector.is_none() {
                                        error_msg = Some("affector_id is required".to_string());
                                    }

                                    if affected.is_none() {
                                        error_msg = Some("affected_id is required".to_string());
                                    }

                                    if error_msg.is_some() {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    } else {
                                        let mut msg_content = Map::new();

                                        msg_content.insert(
                                            "affected_id".to_string(),
                                            Value::String(affected.unwrap()),
                                        );

                                        msg_content.insert(
                                            "affector_id".to_string(),
                                            Value::String(affector.unwrap()),
                                        );

                                        //used to interact with other game objects
                                        LOBBY.do_send(GameMessage {
                                            id: self.id.to_owned(),
                                            msg: construct_msg(
                                                "affect",
                                                None,
                                                Some(msg_content.to_owned()),
                                            ),
                                            exclude: vec![self.id.to_owned()],
                                        })
                                    }
                                }

                                "spawn" => {
                                    //used to create temp lived objects in other players games such as projectiles that dont need to be stored in game state

                                    let mut msg_content = Map::new();

                                    let mut spwn: Option<Map<String, Value>> = None;

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "spawn" => {
                                                if let Some(spawn) = val.as_object() {
                                                    spwn = Some(spawn.to_owned());
                                                }
                                            }

                                            "spawner" => {
                                                if let Some(spawner) = val.as_str() {
                                                    msg_content.insert(
                                                        "spawer".to_string(),
                                                        Value::String(spawner.to_string()),
                                                    );
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    if let Some(mut spawn) = spwn {
                                        //gives it an id
                                        spawn.insert(
                                            "id".to_owned(),
                                            Value::String(Uuid::new_v4().to_string()),
                                        );

                                        msg_content.insert(
                                            "spawn".to_string(),
                                            Value::Object(spawn.to_owned()),
                                        );
                                    } else {
                                        error_msg = Some("Spawn is required".to_string())
                                    }

                                    if error_msg.is_none() {
                                        //sends to straight to every player since storage is unneeded
                                        LOBBY.do_send(GameMessage {
                                            id: self.id.to_owned(),
                                            msg: construct_msg(
                                                "spawn",
                                                None,
                                                Some(msg_content.to_owned()),
                                            ),
                                            exclude: Vec::new(),
                                        })
                                    } else {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    }
                                }

                                "despawn" => {
                                    let mut msg_content = Map::new();

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "spawn_id" => {
                                                if let Some(spawn) = val.as_str() {
                                                    msg_content.insert(
                                                        "spawn_id".to_string(),
                                                        Value::String(spawn.to_string()),
                                                    );
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    LOBBY.do_send(GameMessage {
                                        id: self.id.to_owned(),
                                        msg: construct_msg(
                                            "despawn",
                                            None,
                                            Some(msg_content.to_owned()),
                                        ),
                                        exclude: vec![self.id.to_owned()],
                                    })
                                }

                                "join" => {
                                    let mut game_id: Option<String> = None;
                                    let mut password: Option<String> = None;
                                    let mut data: Option<Map<String, Value>> = None;
                                    let mut account_id: Option<AccountId> = None;

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "game_id" => {
                                                if let Some(id) = val.as_str() {
                                                    game_id = Some(id.to_string());
                                                } else {
                                                    error_msg = Some("Enter game id".to_string())
                                                }
                                            }

                                            "account_id" => {
                                                if let Ok(acc_id) = AccountId::try_from(
                                                    val.as_str().unwrap().to_string(),
                                                ) {
                                                    account_id = Some(acc_id)
                                                } else {
                                                    error_msg = Some(
                                                        "Enter Valid NEAR account id".to_string(),
                                                    )
                                                }
                                            }

                                            "password" => {
                                                if let Some(pwrd) = val.as_str() {
                                                    password = Some(pwrd.to_string());
                                                } else {
                                                    error_msg = Some("Password field only accepts a string value".to_string())
                                                };
                                            }

                                            "data" => {
                                                if let Some(player_data) = val.as_object() {
                                                    data = Some(player_data.to_owned());
                                                } else {
                                                    error_msg = Some(
                                                        "Player data only accepts object"
                                                            .to_string(),
                                                    )
                                                };
                                            }

                                            _ => {}
                                        }
                                    }

                                    if game_id.is_none() {
                                        error_msg = Some("Game id is required".to_string());
                                    }

                                    if data.is_none() {
                                        error_msg = Some("Player data is required".to_string());
                                    }

                                    if error_msg.is_some() {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    } else {
                                        LOBBY.do_send(Join {
                                            id: self.id,
                                            game_id: game_id.unwrap(),
                                            account_id,
                                            password,
                                            socket: ctx.address(),
                                            data: data.unwrap(),
                                        });
                                    }
                                }

                                "leave" => {
                                    //disconnects from game and not server

                                    LOBBY.do_send(Leave {
                                        id: self.id,
                                        rejoin: None,
                                    })
                                }

                                "migrate" => {
                                    //changes host
                                    let mut game_id: Option<String> = None;
                                    let mut hosts = Vec::new();

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "game_id" => {
                                                if let Some(id) = val.as_str() {
                                                    game_id = Some(id.to_string());
                                                }
                                            }

                                            "hosts" => {
                                                if let Some(arr) = val.as_array() {
                                                    for v in arr {
                                                        if let Ok(uid) =
                                                            Uuid::parse_str(v.as_str().unwrap())
                                                        {
                                                            hosts.push(uid)
                                                        } else {
                                                            error_msg = Some(
                                                                "hosts field only accepts uid's"
                                                                    .to_string(),
                                                            );
                                                        }
                                                    }
                                                } else {
                                                    error_msg = Some(
                                                        "hosts field only accepts array"
                                                            .to_string(),
                                                    );
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    if error_msg.is_none() {
                                        //could use SetHost msg too
                                        LOBBY.do_send(Migrate {
                                            game_id,
                                            potential_hosts: hosts,
                                            host: self.id,
                                        })
                                    } else {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    }
                                }

                                "msg" => {
                                    let mut reciptiants: Vec<AccountId> = Vec::new();
                                    let mut msg: Option<String> = None;

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "recipients" => {
                                                if let Some(list) = val.as_array() {
                                                    for id in list {
                                                        if let Ok(acc_id) = AccountId::try_from(
                                                            id.as_str().unwrap().to_string(),
                                                        ) {
                                                            reciptiants.push(acc_id)
                                                        } else {
                                                            error_msg = Some(format!(
                                                                "Invalid account id: {:?}",
                                                                id
                                                            ))
                                                        };
                                                    }
                                                } else {
                                                    error_msg = Some("Recipiants only accepts array of account ids".to_string())
                                                }
                                            }

                                            "msg" => {
                                                if let Some(message) = val.as_str() {
                                                    msg = Some(message.to_string())
                                                } else {
                                                    error_msg = Some(
                                                        "Msg field only accepts string".to_string(),
                                                    )
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    if msg.is_none() {
                                        error_msg = Some("Message is required".to_string());
                                    }

                                    if error_msg.is_none() {
                                        LOBBY.do_send(ClientMessage {
                                            id: self.id,
                                            msg: msg.unwrap(),
                                            reciptiants,
                                        });
                                    } else {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    }
                                }

                                "list" => {
                                    //lists current games

                                    //obj.get("search_string") ???
                                    LOBBY.do_send(List {
                                        id: self.id,
                                        account_id: None,
                                    })
                                }

                                "end" => {
                                    let mut game_id: Option<String> = None;

                                    let mut error_msg: Option<String> = None;

                                    for (key, val) in obj {
                                        match key.as_str() {
                                            "game_id" => {
                                                if let Some(id) = val.as_str() {
                                                    game_id = Some(id.to_string());
                                                }
                                            }

                                            _ => {}
                                        }
                                    }

                                    if game_id.is_none() {
                                        error_msg = Some("Game id is required".to_string());
                                    }

                                    if error_msg.is_none() {
                                        //allows host to end hosted game manually
                                        LOBBY.do_send(End {
                                            id: self.id,
                                            game_id: game_id.unwrap(),
                                        })
                                    } else {
                                        ctx.address()
                                            .do_send(construct_msg("error", error_msg, None));
                                    }
                                }

                                &_ => ctx.address().do_send(construct_msg(
                                    "error",
                                    Some("Uexpected msg_type".to_string()),
                                    None,
                                )),
                            }
                        }
                    }
                    Err(_) => {}
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
        }
    }
}

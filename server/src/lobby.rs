use crate::game::GameId;
use crate::ws::HTTPActor;
use crate::{game::Game, messages::*};
use actix::{Actor, Addr, AsyncContext, Context, Handler, SpawnHandle};
use near_sdk::AccountId;
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use uuid::Uuid;

const GLOBAL_TICK_INTERVAL: Duration = Duration::from_millis(1000 / 60);
const TIMEOUT: Duration = Duration::from_secs(600);

pub struct Client {
    pub socket: Addr<HTTPActor>,
    pub game: Option<GameInfo>,      //reference to game
    pub hosting: Option<Addr<Game>>, //reference to game
    pub account_id: Option<AccountId>,
    pub resolved: bool,
    pub disconnected: Option<Instant>,
}

#[derive(Clone)]
pub struct GameInfo {
    addr: Addr<Game>,
    entry: Join, //info the player used to join the game (for restoring game session)
    connected: bool,
}

impl Client {
    pub fn new(socket: Addr<HTTPActor>) -> Self {
        Self {
            resolved: false,
            socket,
            game: None,
            hosting: None,
            account_id: None,
            disconnected: None,
        }
    }
}
pub struct Lobby {
    sessions: Mutex<HashMap<Uuid, Client>>, //used to locate lobby of player. or give easy ref to address
    games: Mutex<HashMap<GameId, Addr<Game>>>,
    t: Instant,
}

impl Lobby {
    fn tick(&self, ctx: &mut Context<Self>) -> SpawnHandle {
        ctx.run_interval(GLOBAL_TICK_INTERVAL, |act, _ctx| {
            let mut clients = act.sessions.lock().unwrap();

            let mut dc: Vec<Uuid> = Vec::new();

            for (uid, client) in clients.iter() {
                if let Some(dc_time) = client.disconnected {
                    if act.t.duration_since(dc_time) >= TIMEOUT {
                        dc.push(*uid);
                        println!("[Server] {:?} has disconnected", &uid);
                    }
                }
            }

            for uid in dc {
                clients.remove(&uid);
            }

            act.t = Instant::now();
        })
    }
}

impl Default for Lobby {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            games: Mutex::new(HashMap::new()),
            t: Instant::now(),
        }
    }
}

impl Actor for Lobby {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        self.tick(ctx);
    }
}

impl Handler<Connect> for Lobby {
    type Result = ();
    fn handle(&mut self, msg: Connect, _: &mut Context<Self>) -> Self::Result {
        let mut guard = self.sessions.lock().unwrap();

        guard.insert(msg.id, Client::new(msg.addr.to_owned()));

        msg.addr.do_send(construct_msg("connected", None, None));

        println!("[Server] {:?} has connected", &msg.id);

        // security ??
    }
}

impl Handler<Disconnect> for Lobby {
    type Result = ();
    fn handle(&mut self, msg: Disconnect, _: &mut Context<Self>) -> Self::Result {
        let mut clients = self.sessions.lock().unwrap();

        if let Some(client) = clients.get_mut(&msg.id) {
            client.disconnected = Some(Instant::now());
            if let Some(game) = &client.game {
                game.addr.do_send(Leave {
                    id: msg.id,
                    rejoin: None,
                })
            }
        };
    }
}

impl Handler<Register> for Lobby {
    type Result = ();
    fn handle(&mut self, mut msg: Register, _: &mut Context<Self>) {
        let mut guard = self.sessions.lock().unwrap();

        let mut client = guard.remove(&msg.id).unwrap();

        let mut error_msg: Option<String> = None;

        for (uid, player) in guard.iter_mut() {
            if player.account_id.as_ref() == Some(&msg.account_id) {
                if player.disconnected.is_some() {
                    msg.id = *uid;
                    if let Some(old_game) = &player.game {
                        if msg.join.is_none() {
                            let mut entry = old_game.entry.to_owned();
                            entry.socket = client.socket.to_owned();
                            msg.join = Some(entry)
                        }
                    }
                } else {
                    error_msg = Some("Account id already registered".to_string());
                }
                break;
            }
        }

        if error_msg.is_none() {
            client.account_id = Some(msg.account_id.to_owned());

            client.socket.do_send(msg.to_owned());

            guard.insert(msg.id, client);

            println!("[Server] {:?} has registered", &msg.account_id.to_string());

            if let Some(mut join) = msg.join {
                let games = self.games.lock().unwrap();

                join.account_id = Some(msg.account_id.to_owned());

                if let Some(game) = games.get(&join.game_id) {
                    game.do_send(join)
                }
            }
        } else {
            client
                .socket
                .do_send(construct_msg("error", error_msg, None));

            guard.insert(msg.id, client);
        }
    }
}

impl Handler<Create> for Lobby {
    type Result = ();

    fn handle(&mut self, msg: Create, ctx: &mut Context<Self>) {
        let mut error_msg: Option<String> = None;

        let mut msg_content = Map::new();

        msg_content.insert("game_id".to_string(), Value::String(msg.game_id.to_owned()));

        msg_content.insert("host_id".to_string(), Value::String(msg.id.to_string()));

        let mut guard = self.games.lock().unwrap();

        if guard.get(&msg.game_id).is_some() {
            error_msg = Some("Game id already exists".to_string())
        }

        let mut sessions = self.sessions.lock().unwrap();

        let client = sessions.get_mut(&msg.id).unwrap();

        if client.account_id.is_none() {
            error_msg = Some("You must register an account id".to_string())
        }

        if error_msg.is_none() {
            let game = Game::new(msg.to_owned(), ctx.address()).start();

            guard.insert(msg.game_id.to_owned(), game.to_owned());

            ctx.address().do_send(SetHost {
                host: msg.id.to_owned(),
                game: Some(game.to_owned()),
            });

            client.socket.do_send(construct_msg(
                "created",
                Some(format!("{} created.", msg.game_id.to_owned())),
                Some(msg_content),
            ));

            println!(
                "{} has been created by {}",
                msg.game_id,
                client.account_id.as_ref().unwrap()
            );
        } else {
            client
                .socket
                .do_send(construct_msg("error", error_msg, Some(msg_content)))
        }
    }
}

impl Handler<Join> for Lobby {
    type Result = ();

    fn handle(&mut self, mut msg: Join, ctx: &mut Context<Self>) {
        let mut guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get_mut(&msg.id) {
            let mut error_msg: Option<String> = None;

            if client.account_id.is_none() {
                if let Some(account_id) = msg.account_id.as_ref() {
                    ctx.address().do_send(Register {
                        id: msg.id,
                        account_id: account_id.to_owned(),
                        join: Some(msg.to_owned()),
                    })
                }
            } else {
                msg.account_id = client.account_id.to_owned();

                let games = self.games.lock().unwrap();

                if let Some(old_game) = &client.game {
                    if old_game.connected {
                        old_game.addr.do_send(Leave {
                            id: msg.id,
                            rejoin: Some(msg),
                        })
                    } else {
                        if let Some(game) = games.get(&msg.game_id) {
                            game.do_send(msg);
                        } else {
                            error_msg = Some(format!("game id '{}' does not exist", &msg.game_id))
                        }
                    }
                } else {
                    if let Some(game) = games.get(&msg.game_id) {
                        game.do_send(msg);
                    } else {
                        error_msg = Some(format!("game id '{}' does not exist", &msg.game_id))
                    }
                }
            }

            if error_msg.is_some() {
                client
                    .socket
                    .do_send(construct_msg("error", error_msg, None));
            }
        }
    }
}

impl Handler<Joined> for Lobby {
    type Result = ();

    fn handle(&mut self, msg: Joined, _: &mut Context<Self>) {
        let mut guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get_mut(&msg.entry.id) {
            client.game = Some(GameInfo {
                addr: msg.game.to_owned(),
                entry: msg.entry.to_owned(),
                connected: true,
            });

            client.socket.do_send(msg);
        }
    }
}

impl Handler<Leave> for Lobby {
    type Result = ();

    fn handle(&mut self, msg: Leave, _: &mut Context<Self>) {
        let mut guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get_mut(&msg.id) {
            if let Some(game) = &client.game {
                game.addr.do_send(msg)
            }
        }
    }
}

impl Handler<Left> for Lobby {
    type Result = ();

    fn handle(&mut self, msg: Left, _: &mut Context<Self>) {
        let mut guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get_mut(&msg.id) {
            let mut game = client.game.as_mut().unwrap();

            game.entry = msg.rejoin.to_owned();
            game.connected = false;
            //client.game = Some(game.to_owned());

            client.socket.do_send(msg);
        }
    }
}

impl Handler<Info> for Lobby {
    type Result = ();

    fn handle(&mut self, msg: Info, _: &mut Context<Self>) {
        let guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get(&msg.id) {
            client
                .socket
                .do_send(construct_msg("info", None, Some(msg.info)))
        }
    }
}

impl Handler<List> for Lobby {
    type Result = ();
    fn handle(&mut self, msg: List, _: &mut Context<Self>) -> Self::Result {
        let guard = self.games.lock().unwrap();

        for (_, game) in guard.iter() {
            game.do_send(Info {
                id: msg.id,
                account_id: msg.account_id.to_owned(),
                info: Map::new(),
            });
        }
    }
}

//updates server game data, probably needs to do alot more
impl Handler<Update> for Lobby {
    type Result = ();

    fn handle(&mut self, msg: Update, _: &mut Context<Self>) -> Self::Result {
        let guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get(&msg.id) {
            if let Some(game) = &client.game {
                game.addr.do_send(msg);
            }
        }
    }
}

impl Handler<GameMessage> for Lobby {
    type Result = ();
    fn handle(&mut self, msg: GameMessage, _: &mut Context<Self>) -> Self::Result {
        let guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get(&msg.id) {
            if let Some(game) = &client.game {
                game.addr.do_send(msg)
            }
        }
    }
}

//peer to peer chat
impl Handler<ClientMessage> for Lobby {
    type Result = ();

    fn handle(&mut self, msg: ClientMessage, _: &mut Context<Self>) -> Self::Result {
        let guard = self.sessions.lock().unwrap();

        let client = guard.get(&msg.id).unwrap();

        let display_id = if let Some(acc_id) = client.account_id.to_owned() {
            acc_id.to_string()
        } else {
            msg.id.to_string()
        };

        let message = construct_msg("msg", Some(format!("{} : {}", display_id, msg.msg)), None);

        let mut res = msg.reciptiants.to_owned();

        if msg.reciptiants.len() > 0 {
            for (_, session) in guard
                .iter()
                .filter(|(_, session)| session.account_id.is_some())
            {
                if let Some(acc_id) = session.account_id.to_owned() {
                    if msg.reciptiants.contains(&acc_id) {
                        session.socket.do_send(message.to_owned());

                        let idx = res.iter().position(|id| id == &acc_id).unwrap();

                        res.remove(idx);
                    }
                }
            }

            for acc_id in msg.reciptiants {
                client.socket.do_send(construct_msg(
                    "error",
                    Some(format!("cannot find account id: {}", acc_id)),
                    None,
                ))
            }
        } else if let Some(game) = &client.game {
            game.addr.do_send(GameMessage {
                id: msg.id.to_owned(),
                msg: message.to_owned(),
                exclude: vec![msg.id.to_owned()],
            })
        }
    }
}

impl Handler<SetHost> for Lobby {
    type Result = ();
    fn handle(&mut self, msg: SetHost, _: &mut Context<Self>) -> Self::Result {
        let mut guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get_mut(&msg.host) {
            if let Some(old_game) = &client.hosting {
                old_game.do_send(Migrate {
                    potential_hosts: Vec::new(),
                    host: msg.host.to_owned(),
                    game_id: None,
                })
            }
            client.hosting = msg.game;
        }
    }
}

impl Handler<Migrate> for Lobby {
    type Result = ();
    fn handle(&mut self, msg: Migrate, ctx: &mut Context<Self>) -> Self::Result {
        let guard = self.sessions.lock().unwrap();

        if let Some(client) = guard.get(&msg.host) {
            if let Some(game) = &client.hosting {
                let mut res = false;
                for host in msg.potential_hosts {
                    //for now sets first potential host as new host

                    //can filter potentialhosts here
                    game.do_send(SetHost {
                        host,
                        game: Some(game.to_owned()),
                    });
                    res = true;

                    break;
                }
                if !res {
                    if let Some(game_id) = msg.game_id {
                        ctx.address().do_send(End {
                            id: msg.host,
                            game_id,
                        });
                    }
                }
            }
        }
    }
}

impl Handler<End> for Lobby {
    type Result = ();
    fn handle(&mut self, msg: End, _: &mut Context<Self>) -> Self::Result {
        let mut guard = self.games.lock().unwrap();

        if let Some(game) = guard.remove(&msg.game_id) {
            game.do_send(msg)
        }
    }
}

use crate::{
    game::{Game, GameId},
    ws::HTTPActor,
};
use actix::prelude::*;
use near_sdk::AccountId;
use serde_json::{to_string, Map, Value};
use uuid::Uuid;

pub fn construct_msg(
    msg_type: &str,
    msg: Option<String>,
    msg_content: Option<Map<String, Value>>,
) -> PlayerMessage {
    let mut json: Map<String, Value> = if let Some(content) = msg_content {
        content.to_owned()
    } else {
        Map::new()
    };

    if let Some(m) = msg {
        json.insert("msg".to_string(), Value::String(m.to_owned()));
    }

    json.insert("msg_type".to_string(), Value::String(msg_type.to_owned()));

    let res = to_string(&json).unwrap();

    PlayerMessage(res)
}

#[derive(Message, Clone)]
#[rtype(result = "()")]
pub struct Join {
    pub id: Uuid,
    pub socket: Addr<HTTPActor>,
    pub game_id: GameId,
    pub account_id: Option<AccountId>,
    pub password: Option<String>,
    pub data: Map<String, Value>,
}

#[derive(Message, Clone)]
#[rtype(result = "()")]
pub struct Create {
    pub id: Uuid,
    pub game_id: GameId,
    //for contract interactions
    pub privite: bool,
    pub password: Option<String>,
    pub whitelist: Vec<AccountId>,
    pub data: Map<String, Value>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Info {
    pub id: Uuid,
    pub account_id: Option<AccountId>,
    pub info: Map<String, Value>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Update {
    pub id: Uuid,
    pub obj: Map<String, Value>,
}

//unhandled notification to client (constructs accepted json message by giving ws.rs access to send_message function)
#[derive(Message, Clone)]
#[rtype(result = "()")]
pub struct PlayerMessage(pub String);

#[derive(Message)]
#[rtype(result = "()")]
pub struct ClientMessage {
    /// Id of the client session
    pub id: Uuid,

    /// Peer message
    pub msg: String,

    //list of Uuids for privite group chat
    pub reciptiants: Vec<AccountId>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Leave {
    pub id: Uuid,
    pub rejoin: Option<Join>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Connect {
    pub id: Uuid,
    pub addr: Addr<HTTPActor>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub id: Uuid,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct End {
    pub id: Uuid,
    pub game_id: GameId,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Migrate {
    pub game_id: Option<GameId>,
    pub potential_hosts: Vec<Uuid>,
    pub host: Uuid,
}

#[derive(Message, Clone)]
#[rtype(result = "()")]
pub struct GameMessage {
    pub id: Uuid,
    pub msg: PlayerMessage,
    pub exclude: Vec<Uuid>,
}

#[derive(Message, Clone)]
#[rtype(result = "()")]
pub struct Register {
    pub id: Uuid,
    pub account_id: AccountId,
    pub join: Option<Join>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Left {
    pub id: Uuid,
    pub game_id: GameId,
    pub rejoin: Join,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Joined {
    pub game: Addr<Game>,
    pub entry: Join,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SetHost {
    pub host: Uuid,
    pub game: Option<Addr<Game>>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct UnHost {
    pub host: Uuid,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct List {
    pub id: Uuid,
    pub account_id: Option<AccountId>,
}

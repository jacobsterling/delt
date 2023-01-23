use crate::types::{
    Content, Entities, EntityId, PlayerInfo, PlayerStats, SessionState, Spawn, UserId,
};
use actix::prelude::*;
use chrono::NaiveDateTime;
use near_primitives::types::AccountId;
use serde::{Deserialize, Serialize, Serializer};
use serde_json::to_string;
use std::{
    collections::{HashMap, HashSet},
    fmt, io,
};
use uuid::Uuid;

#[derive(Message, Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "msg_type", content = "content")]
#[serde(rename_all = "snake_case")]
#[rtype(result = "()")]
pub enum ClientMessage {
    Update(Update),
    Message {
        msg: String,
        //list of Uuids for privite group chat
        #[serde(default = "Vec::new", skip_serializing_if = "Vec::is_empty")]
        reciptiants: Vec<UserId>,
    },
    Join {
        session_id: Uuid,
    },
    Leave,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "update_type", content = "update")]
#[serde(rename_all = "snake_case")]
pub enum Update {
    Affect {
        affector: EntityId,
        affectors: HashSet<String>,
        affected: HashSet<EntityId>,
    },
    Entities {
        active: Entities,
        spawns: Entities,
        kill_list: HashSet<EntityId>,
    },
    ChangeSpawn(Spawn),
    Stats(PlayerStats),
    Ready,
}

#[derive(Message, Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "msg_type", content = "content")]
#[serde(rename_all = "snake_case")]
#[rtype(result = "()")]
pub enum ServerMessage {
    Update(Update),
    Tick {
        tick: u128,
        state: SessionState,
        players: HashMap<UserId, PlayerInfo>,
    },
    Message {
        sender: UserId,
        msg: String,
    },
    Joined {
        session_id: Uuid,
        state: SessionState,
        players: HashMap<UserId, PlayerInfo>,
    },
    Starting(NaiveDateTime),
    Left {
        user_id: UserId,
        managed_entities: HashSet<EntityId>,
    },
    Disconnected,
    Connected,
    Notification(Content),
}

impl ServerMessage {
    pub fn to_message(&self) -> String {
        to_string(self).unwrap()
    }
}

#[derive(Message, Debug)]
#[rtype(result = "()")]
pub enum ServerError {
    Std(io::Error),
    Serde(serde_json::Error),
    Database(diesel::result::Error),
    Transaction(String),
    Query(String),
}

impl ServerError {
    pub fn new(kind: io::ErrorKind, msg: &str) -> Self {
        Self::Std(io::Error::new(kind, msg))
    }

    pub fn to_message(&self) -> String {
        let mut body = Content::new();

        body.insert("msg_type", "error");

        body.insert("content", &self);

        to_string(&body).unwrap()
    }
}

impl Serialize for ServerError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl std::error::Error for ServerError {}

impl fmt::Display for ServerError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", to_string(self).unwrap())
    }
}

#[derive(Message, Clone)]
#[rtype(result = "(SessionState, HashMap<UserId, PlayerInfo>)")]
pub struct Join {
    pub user_id: UserId,
    pub account_id: Option<AccountId>,
    pub player_info: PlayerInfo,
}

#[derive(Message)]
#[rtype(result = "Option<(Uuid, PlayerInfo)>")]
pub struct Leave(pub UserId);

#[derive(Message)]
#[rtype(result = "()")]
pub struct SessionUpdate {
    pub updater: UserId,
    pub update: Update,
}
#[derive(Message)]
#[rtype(result = "()")]
pub struct SessionMessage {
    pub msg: ServerMessage,
    pub exclude: Vec<UserId>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SessionEnd;

#[derive(Message)]
#[rtype(result = "()")]
pub struct SessionEnded(pub Uuid);

#[derive(Message)]
#[rtype(result = "()")]
pub struct PlayerSessionResolve {
    pub session_id: Uuid,
    pub account_id: AccountId,
    pub xp: Option<u128>,
}

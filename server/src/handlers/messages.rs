use crate::types::{
    Content, Entities, EntityId, GameId, PlayerInfo, PlayerStats, SessionState, SessionView, Spawn,
    UserId,
};
use actix::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::to_string;
use std::{
    collections::{HashMap, HashSet},
    fmt,
};
use uuid::Uuid;

#[derive(Message, Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "msg_type", content = "content")]
#[serde(rename_all = "snake_case")]
#[rtype(result = "()")]
pub enum ClientMessage {
    Update(Update),
    Create {
        game_id: GameId,
        #[serde(default = "Option::default")]
        password: Option<String>,
        #[serde(default = "Option::default")]
        whitelist: Option<Vec<UserId>>,
        #[serde(default = "SessionState::default")]
        state: SessionState,
    },
    Join {
        session_id: Uuid,
        #[serde(default = "Option::default")]
        password: Option<String>,
    },
    Message {
        msg: String,
        //list of Uuids for privite group chat
        #[serde(default = "Vec::new", skip_serializing_if = "Vec::is_empty")]
        reciptiants: Vec<UserId>,
    },
    Leave,
    Sessions {
        #[serde(default = "Option::default")]
        session_id: Option<String>,
        #[serde(default = "Option::default")]
        game_id: Option<GameId>,
        #[serde(default = "Option::default")]
        host_id: Option<UserId>,
    },
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
    Created {
        session_id: Uuid,
        game_id: GameId,
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
    Left {
        user_id: UserId,
        managed_entities: HashSet<EntityId>,
    },
    Ended {
        session_id: Uuid,
    },
    Disconnected,
    Connected,
    Sessions(HashMap<Uuid, SessionView>),
    Notification(Content),
}

impl ServerMessage {
    pub fn to_message(&self) -> String {
        to_string(self).unwrap()
    }
}

#[derive(Message, Debug, Serialize)]
#[rtype(result = "()")]
#[serde(tag = "error_type", content = "error")]
#[serde(rename_all = "snake_case")]
pub enum ServerError {
    Query(String),
    Transaction(String),
    UnexpectedResponse(String),
    Restricted(String),
    Internal(String),
    DbError(String),
}

impl ServerError {
    pub fn to_message(&self) -> String {
        let mut body = Content::new();

        body.insert("msg_type", "error");

        body.insert("content", &self);

        to_string(&body).unwrap()
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
    pub player_info: PlayerInfo,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Leave(pub UserId);

#[derive(Message)]
#[rtype(result = "()")]
pub struct SessionUpdate {
    pub updater: UserId,
    pub update: Update,
}

#[derive(Message)]
#[rtype(result = "(SessionState, HashMap<UserId, PlayerInfo>)")]
pub struct SessionQuery;

#[derive(Message)]
#[rtype(result = "()")]
pub struct SessionMessage {
    pub msg: ServerMessage,
    pub exclude: Vec<UserId>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SessionEnded(pub Uuid);

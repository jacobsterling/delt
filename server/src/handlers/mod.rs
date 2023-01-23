use std::{collections::HashMap, str::FromStr, sync::Mutex, time::Instant};

use actix::{Actor, Addr};
use chrono::{Local, NaiveDateTime};
use delt_d::{character::Character, staking::Pool};
use diesel::{dsl::count_star, insert_into, prelude::*};
use near_primitives::types::AccountId;
use uuid::Uuid;

use crate::{
    db::{
        models::{Game, NewSession, Session, Whitelist},
        schema, DB,
    },
    handlers::{
        client::ClientActor,
        contract_methods::{get_character, get_pools},
        global::GlobalActor,
        session::SessionActor,
    },
    types::{GameConfig, GameId, Lvl, PlayerInfo, PlayerStats, SessionState, UserId},
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
    pub account_id: Option<AccountId>,
}

impl ClientInfo {
    pub fn new(actor: Addr<ClientActor>, account_id: Option<AccountId>) -> Self {
        Self {
            started_at: Local::now().naive_local(),
            last_update: Instant::now(),
            ms: Vec::new(),
            actor,
            account_id,
        }
    }
}

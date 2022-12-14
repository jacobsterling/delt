use chrono::{Local, NaiveDateTime};
use diesel::{
    deserialize::{self, FromSql, FromSqlRow},
    expression::AsExpression,
    pg::{Pg, PgValue},
    serialize::{self, Output, ToSql},
    sql_types::{Int4, Jsonb},
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{from_slice, to_string, to_value, Map, Value};
use std::{
    collections::{
        hash_map::{DefaultHasher, Entry},
        HashMap, HashSet,
    },
    fmt,
};
use uuid::Uuid;
pub type GameId = String;
pub type UserId = String;

use std::hash::{Hash, Hasher};

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct SessionView {
    pub creator: UserId,
    pub started_at: NaiveDateTime,
    pub game_id: GameId,
    pub game_creator: UserId,
    pub created_at: NaiveDateTime,
    pub players: i32,
    pub password: bool,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, AsExpression, FromSqlRow)]
#[diesel(sql_type = Jsonb)]
pub struct SessionState {
    pub spawn: Spawn,
    pub entities: Entities,
    #[serde(default = "HashMap::new")]
    pub pending_spawns: HashMap<EntityId, EntityId>,
    pub destroyed_entities: Entities,
    #[serde(default = "HashMap::new")]
    pub stats: HashMap<UserId, PlayerStats>,
    #[serde(default = "Content::new")]
    pub data: Content,
}

fn default_scene() -> String {
    "BaseScene".to_string()
}

impl ToSql<Jsonb, Pg> for SessionState
where
    Value: ToSql<Jsonb, Pg>,
{
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        let game_state = to_value(&self).unwrap() as Value;

        <Value as ToSql<Jsonb, Pg>>::to_sql(&game_state, &mut out.reborrow())
    }
}

impl FromSql<Jsonb, Pg> for SessionState {
    fn from_sql(bytes: PgValue) -> deserialize::Result<Self> {
        match from_slice::<SessionState>(bytes.as_bytes()) {
            Ok(state) => Ok(state),
            Err(_) => Ok(SessionState::default()),
        }
    }
}

impl fmt::Display for SessionState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", to_string(self).unwrap())
    }
}

impl Default for SessionState {
    fn default() -> Self {
        Self {
            spawn: Spawn::default(),
            entities: Entities::default(),
            destroyed_entities: Entities::default(),
            data: Content::new(),
            pending_spawns: HashMap::new(),
            stats: HashMap::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone, AsExpression, FromSqlRow)]
#[diesel(sql_type = Jsonb)]
pub struct PlayerInfo {
    pub ping: u32,
    pub managed_entities: HashSet<EntityId>,
    pub stats: PlayerStats,
}

impl ToSql<Jsonb, Pg> for PlayerInfo
where
    Value: ToSql<Jsonb, Pg>,
{
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        let player_info = to_value(&self).unwrap();

        <Value as ToSql<Jsonb, Pg>>::to_sql(&player_info, &mut out.reborrow())
    }
}

impl FromSql<Jsonb, Pg> for PlayerInfo {
    fn from_sql(bytes: PgValue) -> deserialize::Result<Self> {
        match from_slice::<PlayerInfo>(bytes.as_bytes()) {
            Ok(info) => Ok(info),

            Err(_) => Ok(PlayerInfo::default()),
        }
    }
}

impl Default for PlayerInfo {
    fn default() -> Self {
        Self {
            ping: 0,
            managed_entities: HashSet::new(),
            stats: PlayerStats::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct PlayerStats {
    pub kills: i32,
    pub xp_accrual: u64,
}

impl Default for PlayerStats {
    fn default() -> Self {
        Self {
            kills: 0,
            xp_accrual: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, AsExpression, FromSqlRow, PartialOrd)]
#[diesel(sql_type = Int4)]
pub struct Lvl(pub i32);

impl Default for Lvl {
    fn default() -> Self {
        Self(1)
    }
}

impl Lvl {
    pub fn to_xp(&self) -> u128 {
        (self.0 as f64).exp() as u128
    }

    pub fn from_xp(xp: u128) -> Self {
        Self(((xp as f64).ln() + 1.0).floor() as i32)
    }
}

impl ToSql<Int4, Pg> for Lvl {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        <i32 as ToSql<Int4, Pg>>::to_sql(&self.0, &mut out.reborrow())
    }
}

impl FromSql<Int4, Pg> for Lvl {
    fn from_sql(bytes: PgValue) -> deserialize::Result<Self> {
        match from_slice::<Lvl>(bytes.as_bytes()) {
            Ok(lvl) => Ok(lvl),

            Err(_) => Ok(Lvl::default()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Eq)]
pub struct Entities(pub HashMap<EntityId, Entity>);

impl Entities {
    pub fn get_mut(&mut self, id: &EntityId) -> Option<&mut Entity> {
        self.0.get_mut(id)
    }

    pub fn keys(&self) -> HashSet<EntityId> {
        let keys: HashSet<EntityId> = self.0.keys().into_iter().copied().collect();

        keys
    }

    pub fn managed(&self, manager: &UserId) -> HashSet<EntityId> {
        let keys: HashSet<EntityId> = self
            .0
            .iter()
            .filter(|(_, entity)| &entity.manager == manager)
            .map(|(id, _)| id.to_owned())
            .collect();

        keys
    }

    pub fn set_managed(&mut self, entity_ids: &HashSet<EntityId>, new_manager: &UserId) {
        for id in entity_ids {
            if let Some(entity) = self.0.get_mut(id) {
                entity.manager = new_manager.to_owned()
            }
        }
    }

    pub fn update(&mut self, id: EntityId, entity: Entity) -> Option<Entity> {
        self.0.insert(id, entity)
    }

    pub fn insert(&mut self, id: &EntityId, entity: Entity) -> EntityId {
        let mut used_id = id.to_owned();

        loop {
            match self.0.entry(used_id.to_owned()) {
                Entry::Occupied(_) => {
                    used_id = EntityId::new();
                }
                Entry::Vacant(vacant) => {
                    vacant.insert(entity);

                    break used_id;
                }
            }
        }
    }

    pub fn remove(&mut self, id: &EntityId) -> Option<Entity> {
        self.0.remove(id)
    }
}

impl Default for Entities {
    fn default() -> Self {
        Self(HashMap::new())
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Eq, Hash, AsExpression, FromSqlRow)]
#[diesel(sql_type = Jsonb)]
pub struct Entity {
    pub display: Content,
    #[serde(default = "Content::new")]
    pub attributes: Content,
    pub manager: UserId,
    pub position: Position,
    #[serde(rename = "type")]
    pub entity_type: String,
    #[serde(default = "Content::new", flatten)]
    pub extentions: Content,
}

impl ToSql<Jsonb, Pg> for Entity
where
    Value: ToSql<Jsonb, Pg>,
{
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        let entity = to_value(&self).unwrap() as Value;

        <Value as ToSql<Jsonb, Pg>>::to_sql(&entity, &mut out.reborrow())
    }
}

impl FromSql<Jsonb, Pg> for Entity {
    fn from_sql(bytes: PgValue) -> deserialize::Result<Self> {
        Ok(from_slice::<Entity>(bytes.as_bytes()).unwrap())
    }
}

#[derive(PartialEq, Clone, Debug, Eq, Hash, Copy, Serialize, Deserialize)]
pub struct EntityId(pub Uuid);

impl EntityId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct Position {
    x: f64,
    y: f64,
}

impl Eq for Position {}

impl Hash for Position {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.x.to_string().hash(state);
        self.y.to_string().hash(state);
    }
}

impl Default for Position {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}
//assumes rectangle

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct Spawn {
    pub scene: String,
    pub zone: (Position, Position),
}

impl Default for Spawn {
    fn default() -> Self {
        Self {
            scene: default_scene(),
            zone: (Position::default(), Position::default()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone, AsExpression, FromSqlRow)]
#[diesel(sql_type = Jsonb)]
pub struct Logs(pub HashMap<NaiveDateTime, Value>);

impl ToSql<Jsonb, Pg> for Logs {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        let logs = to_value(&self).unwrap();

        <Value as ToSql<Jsonb, Pg>>::to_sql(&logs, &mut out.reborrow())
    }
}

impl FromSql<Jsonb, Pg> for Logs {
    fn from_sql(bytes: PgValue) -> deserialize::Result<Self> {
        match from_slice::<Logs>(bytes.as_bytes()) {
            Ok(logs) => Ok(logs),

            Err(_) => Ok(Logs::new()),
        }
    }
}

impl Logs {
    pub fn new() -> Self {
        Self(HashMap::new())
    }

    #[inline]
    pub fn log<V>(&mut self, v: &V)
    where
        V: ?Sized + Serialize,
    {
        self.0
            .insert(Local::now().naive_local(), to_value(&v).unwrap());
    }
}

impl Spawn {
    pub fn rand_spawn(&self) -> Position {
        let mut rng = rand::thread_rng();
        Position {
            x: rng.gen_range(self.zone.0.x..self.zone.1.x),
            y: rng.gen_range(self.zone.0.y..self.zone.1.y),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, AsExpression, FromSqlRow)]
#[diesel(sql_type = Jsonb)]
pub struct Content(pub Map<String, Value>);

impl ToSql<Jsonb, Pg> for Content {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        let content = to_value(&self).unwrap();

        <Value as ToSql<Jsonb, Pg>>::to_sql(&content, &mut out.reborrow())
    }
}

impl FromSql<Jsonb, Pg> for Content {
    fn from_sql(bytes: PgValue) -> deserialize::Result<Self> {
        Ok(from_slice::<Content>(bytes.as_bytes()).unwrap())
    }
}

impl Hash for Content {
    fn hash<H: Hasher>(&self, _: &mut H) {
        let mut hasher = DefaultHasher::new();

        Hash::hash_slice(to_string(&self.0).unwrap().as_bytes(), &mut hasher);

        hasher.finish();
    }
}

impl Content {
    pub fn new() -> Self {
        Self(Map::new())
    }

    #[inline]
    pub fn insert<V>(&mut self, k: &str, v: &V) -> &mut Self
    where
        V: ?Sized + Serialize,
    {
        self.0.insert(k.to_string(), to_value(&v).unwrap());

        self
    }

    #[inline]
    pub fn into_bytes(&self) -> Vec<u8> {
        to_string(self).unwrap().into_bytes()
    }
}

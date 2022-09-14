use crate::*;

use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    env::{self, panic_str},
    AccountId, Balance,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, to_string, Map, Value};

impl Character {
    fn new(attributes: String) -> Self {
        Self {
            xp: 0,
            attributes,
            storage_used: u64::MAX,
        }
    }
}

#[derive(Serialize, Deserialize, BorshDeserialize, BorshSerialize)]
pub struct Character {
    pub xp: Balance,

    //stringified json
    pub attributes: String,

    pub storage_used: u64,
}

pub trait CharacterManagment {
    fn get_character(&self, account_id: &AccountId) -> Character;

    fn set_default_attributes(&mut self, attributes: Map<String, Value>);
}

#[near_bindgen]
impl CharacterManagment for Contract {
    fn get_character(&self, account_id: &AccountId) -> Character {
        match self.accounts.get(account_id) {
            Some(character) => character,

            None => panic_str("Account id is not registered"),
        }
    }

    fn set_default_attributes(&mut self, attributes: Map<String, Value>) {
        require!(env::signer_account_id() == env::current_account_id());

        let new_attr = to_string(&attributes).unwrap();

        self.default_attributes.replace(&new_attr);
    }
}

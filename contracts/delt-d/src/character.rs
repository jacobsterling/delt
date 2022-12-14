use std::ops::Add;

use crate::*;

use near_contract_standards::fungible_token::events::{FtBurn, FtMint};
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    env::{self, panic_str},
    AccountId, Balance, IntoStorageKey,
};
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string, Map, Value};

#[derive(BorshDeserialize, BorshSerialize)]
pub struct AccountManagement {
    /// AccountID -> Account balance.
    pub characters: LookupMap<AccountId, Character>,

    pub default_attributes: LazyOption<String>,

    xp_total: Balance,
}

impl Character {
    fn new(attributes: String) -> Self {
        Self { xp: 0, attributes }
    }
}

#[derive(Serialize, Deserialize, BorshDeserialize, BorshSerialize, Debug, Clone, PartialEq)]
pub struct Character {
    pub xp: Balance,

    //stringified json
    pub attributes: String,
}

pub trait CharacterManagment {
    fn get_character(&self, account_id: &AccountId) -> Character;

    fn set_default_attributes(&mut self, attributes: String);

    fn ft_balance_of(&self, account_id: AccountId) -> U128;

    fn ft_mint(&mut self, account_id: AccountId, amount: U128);

    fn ft_burn(&mut self, account_id: AccountId, amount: U128);

    fn set_attributes(&mut self, account_id: &AccountId, attributes: String);

    fn ft_total_supply(&self) -> U128;

    fn death(&mut self, account_id: AccountId);
}

#[near_bindgen]
impl CharacterManagment for Contract {
    fn get_character(&self, account_id: &AccountId) -> Character {
        match self.accounts.characters.get(account_id) {
            Some(character) => character,

            None => panic_str("Account id is not registered"),
        }
    }

    #[payable]
    fn set_default_attributes(&mut self, attributes: String) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let init_storage = env::storage_usage();

        from_str::<Map<String, Value>>(&attributes).expect("Expected json attributes");

        self.accounts.default_attributes.replace(&attributes);

        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let character = self.get_character(&account_id);

        character.xp.into()
    }

    #[payable]
    fn ft_mint(&mut self, account_id: AccountId, amount: U128) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let init_storage = env::storage_usage();

        let mut character = self.get_character(&account_id);

        match self.accounts.xp_total.checked_add(amount.0) {
            Some(new_amount) => {
                self.accounts.xp_total = new_amount;

                character.xp = character.xp.add(amount.0);

                self.accounts.characters.insert(&account_id, &character);

                FtMint {
                    owner_id: &account_id,
                    amount: &amount,
                    memo: Some("xp gain"),
                }
                .emit()
            }

            None => panic_str("Overflow"),
        }

        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );
    }

    fn ft_burn(&mut self, account_id: AccountId, amount: U128) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let mut character = self.get_character(&account_id);

        let new_amount = self.accounts.xp_total.checked_sub(amount.0).unwrap_or(0);

        self.accounts.xp_total = new_amount;

        character.xp = character.xp.checked_sub(amount.0).unwrap_or(0);

        self.accounts.characters.insert(&account_id, &character);

        FtBurn {
            owner_id: &account_id,
            amount: &amount,
            memo: Some("xp lost"),
        }
        .emit()
    }

    #[payable]
    fn set_attributes(&mut self, account_id: &AccountId, attributes: String) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let init_storage = env::storage_usage();

        //only accept attributes from MT contract and
        //required attribute keys so players can pay for storage ?

        let mut character = self.get_character(&account_id);

        let attr: Map<String, Value> =
            from_str(&attributes).unwrap_or_else(|_| panic_str("Expected json attributes"));

        character.attributes = to_string(&attr).unwrap();

        self.accounts.characters.insert(&account_id, &character);

        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );
    }

    fn ft_total_supply(&self) -> U128 {
        self.accounts.xp_total.into()
    }

    fn death(&mut self, account_id: AccountId) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let character = self.get_character(&account_id);

        let new_character = Character::new(self.accounts.default_attributes.get().unwrap());

        self.accounts.characters.insert(&account_id, &new_character);

        FtBurn {
            owner_id: &account_id,
            amount: &U128(character.xp),
            memo: Some("death"),
        }
        .emit();
    }
}

impl AccountManagement {
    pub fn new<C, D>(characters_prefix: C, attributes_prefix: D) -> Self
    where
        C: IntoStorageKey,
        D: IntoStorageKey,
    {
        Self {
            characters: LookupMap::new(characters_prefix),
            default_attributes: LazyOption::new(attributes_prefix, None),
            xp_total: 0,
        }
    }

    pub fn internal_register(&mut self, account_id: &AccountId) {
        if self
            .characters
            .insert(
                account_id,
                &Character::new(self.default_attributes.get().unwrap()),
            )
            .is_some()
        {
            panic_str("Account aleady registered");
        }
    }
}

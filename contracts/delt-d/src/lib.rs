mod character;
mod ext_contracts;
mod staking;
mod utils;

use near_contract_standards::fungible_token;

use fungible_token::metadata::{FungibleTokenMetadata, FT_METADATA_SPEC};

use character::Character;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LazyOption, LookupMap, UnorderedMap, UnorderedSet};
use near_sdk::json_types::U128;
use near_sdk::{
    env, log, near_bindgen, require, AccountId, Balance, BorshStorageKey, CryptoHash,
    PanicOnDefault, StorageUsage,
};
use serde_json::{to_string, Map};
use staking::{Pool, PoolId, StakeId};
use utils::hash_account_id;

use crate::character::CharacterManagment;
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub metadata: LazyOption<FungibleTokenMetadata>,

    pub default_attributes: LazyOption<String>,

    pub stake_pools: UnorderedMap<PoolId, Pool>,

    pub stakes: LookupMap<AccountId, UnorderedSet<(StakeId, Option<PoolId>)>>,

    /// AccountID -> Account balance.
    pub accounts: LookupMap<AccountId, Character>,

    //pub stakes:
    /// The storage size in bytes for one account.
    pub account_storage_usage: StorageUsage,
}

//change from near icon
const DATA_IMAGE_SVG_ICON: &str = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 288 288'%3E%3Cg id='l' data-name='l'%3E%3Cpath d='M187.58,79.81l-30.1,44.69a3.2,3.2,0,0,0,4.75,4.2L191.86,103a1.2,1.2,0,0,1,2,.91v80.46a1.2,1.2,0,0,1-2.12.77L102.18,77.93A15.35,15.35,0,0,0,90.47,72.5H87.34A15.34,15.34,0,0,0,72,87.84V201.16A15.34,15.34,0,0,0,87.34,216.5h0a15.35,15.35,0,0,0,13.08-7.31l30.1-44.69a3.2,3.2,0,0,0-4.75-4.2L96.14,186a1.2,1.2,0,0,1-2-.91V104.61a1.2,1.2,0,0,1,2.12-.77l89.55,107.23a15.35,15.35,0,0,0,11.71,5.43h3.13A15.34,15.34,0,0,0,216,201.16V87.84A15.34,15.34,0,0,0,200.66,72.5h0A15.35,15.35,0,0,0,187.58,79.81Z'/%3E%3C/g%3E%3C/svg%3E";

#[derive(BorshStorageKey, BorshSerialize)]
pub enum StorageKey {
    Accounts,
    Metadata,
    DefaultAttributes,
    StakePools,
    Stakes,
    StakesPerOwner { account_hash: CryptoHash },
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new() -> Self {
        require!(!env::state_exists(), "Already initialized");

        let metadata = FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "DELT Character & Staking Contract".to_string(),
            symbol: "DELTXP".to_string(),
            icon: Some(DATA_IMAGE_SVG_ICON.to_string()),
            reference: None,
            reference_hash: None,
            decimals: 0,
        };

        metadata.assert_valid();

        let mut stakes = LookupMap::new(StorageKey::Stakes);

        stakes.insert(
            &env::signer_account_id(),
            &UnorderedSet::new(StorageKey::StakesPerOwner {
                account_hash: hash_account_id(&env::signer_account_id()),
            }),
        );

        Self {
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            default_attributes: LazyOption::new(StorageKey::DefaultAttributes, None),
            stakes,
            stake_pools: UnorderedMap::new(StorageKey::StakePools),
            accounts: LookupMap::new(StorageKey::Accounts),
            account_storage_usage: 0,
        }
    }

    pub fn death(&mut self, account_id: AccountId) {
        require!(env::signer_account_id() == env::current_account_id());

        let character = self.get_character(&account_id);

        character.xp = 0;
    }

    pub fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap()
    }
}

// impl StorageManagement for Character {
//     // `registration_only` doesn't affect the implementation for vanilla fungible token.
//     #[allow(unused_variables)]
//     fn storage_deposit(
//         &mut self,
//         account_id: Option<AccountId>,
//         registration_only: Option<bool>,
//     ) -> StorageBalance {
//         let amount: Balance = env::attached_deposit();
//         let account_id = account_id.unwrap_or_else(env::predecessor_account_id);
//         if self.accounts.contains_key(&account_id) {
//             log!("The account is already registered, refunding the deposit");
//             if amount > 0 {
//                 Promise::new(env::predecessor_account_id()).transfer(amount);
//             }
//         } else {
//             let min_balance = self.storage_balance_bounds().min.0;
//             if amount < min_balance {
//                 env::panic_str("The attached deposit is less than the minimum storage balance");
//             }

//             self.internal_register_account(&account_id);
//             let refund = amount - min_balance;
//             if refund > 0 {
//                 Promise::new(env::predecessor_account_id()).transfer(refund);
//             }
//         }
//         self.internal_storage_balance_of(&account_id).unwrap()
//     }

//     /// While storage_withdraw normally allows the caller to retrieve `available` balance, the basic
//     /// Fungible Token implementation sets storage_balance_bounds.min == storage_balance_bounds.max,
//     /// which means available balance will always be 0. So this implementation:
//     /// * panics if `amount > 0`
//     /// * never transfers Ⓝ to caller
//     /// * returns a `storage_balance` struct if `amount` is 0
//     fn storage_withdraw(&mut self, amount: Option<u128>) -> StorageBalance {
//         assert_one_yocto();
//         let predecessor_account_id = env::predecessor_account_id();
//         if let Some(storage_balance) = self.internal_storage_balance_of(&predecessor_account_id) {
//             match amount {
//                 Some(amount) if amount.0 > 0 => {
//                     env::panic_str("The amount is greater than the available storage balance");
//                 }
//                 _ => storage_balance,
//             }
//         } else {
//             env::panic_str(
//                 format!("The account {} is not registered", &predecessor_account_id).as_str(),
//             );
//         }
//     }

//     fn storage_unregister(&mut self, force: Option<bool>) -> bool {
//         self.internal_storage_unregister(force).is_some()
//     }

//     fn storage_balance_bounds(&self) -> StorageBalanceBounds {
//         let required_storage_balance =
//             Balance::from(self.account_storage_usage) * env::storage_byte_cost();
//         StorageBalanceBounds {
//             min: required_storage_balance.into(),
//             max: Some(required_storage_balance.into()),
//         }
//     }

//     fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
//         self.internal_storage_balance_of(&account_id)
//     }
// }

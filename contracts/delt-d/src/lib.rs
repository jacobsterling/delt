pub mod character;
mod ext_contracts;
pub mod staking;
mod utils;

use near_contract_standards::fungible_token;

use fungible_token::metadata::{FungibleTokenMetadata, FT_METADATA_SPEC};

use character::AccountManagement;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LazyOption, LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::{
    env, near_bindgen, require, AccountId, Balance, BorshStorageKey, CryptoHash, PanicOnDefault,
};
use staking::{StakeId, StakeManagement};
use utils::{hash_account_id, refund_deposit_to_account};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub metadata: LazyOption<FungibleTokenMetadata>,

    accounts: AccountManagement,

    staking: StakeManagement,

    owner: AccountId,
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
    pub fn new(owner_id: AccountId) -> Self {
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

        Self {
            owner: owner_id.to_owned(),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            staking: StakeManagement::new(StorageKey::Stakes, StorageKey::StakePools),
            accounts: AccountManagement::new(StorageKey::Accounts, StorageKey::DefaultAttributes),
        }
    }

    pub fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap()
    }

    #[payable]
    pub fn register(&mut self, account_id: Option<AccountId>) {
        let init_storage = env::storage_usage();

        let id = account_id.unwrap_or(env::signer_account_id());

        self.staking.internal_register(&id);
        self.accounts.internal_register(&id);

        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );
    }
}

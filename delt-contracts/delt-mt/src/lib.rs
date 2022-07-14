pub use crate::attributes::*;
mod attributes;
pub use crate::market::*;
pub(crate) mod event;
mod market;
pub mod multi_token;

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::LazyOption;
use near_sdk::json_types::U128;
use near_sdk::Promise;
use near_sdk::{
    env, near_bindgen, require, AccountId, Balance, BorshStorageKey, PanicOnDefault, PromiseOrValue,
};

use multi_token::{
    core::MultiToken,
    metadata::{MtContractMetadata, TokenMetadata, MT_METADATA_SPEC},
    token::{Token, TokenId},
};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct MTContract {
    tokens: MultiToken,
    metadata: LazyOption<MtContractMetadata>,
}

#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    MultiToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    Approval,
}

#[near_bindgen]
impl MTContract {
    #[init]
    pub fn new_default_meta(owner_id: AccountId) -> Self {
        let metadata = MtContractMetadata {
            spec: MT_METADATA_SPEC.to_string(),
            name: "Delt Multitoken".to_string(),
            symbol: "DELTM".to_string(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        };

        Self::new(owner_id, metadata)
    }

    #[init]
    pub fn new(owner_id: AccountId, metadata: MtContractMetadata) -> Self {
        require!(!env::state_exists(), "Already initialized");
        metadata.assert_valid();

        Self {
            tokens: MultiToken::new(
                StorageKey::MultiToken,
                owner_id,
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                Some(StorageKey::Approval),
            ),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
        }
    }

    #[payable]
    pub fn mt_mint(
        &mut self,
        token_owner_id: AccountId,
        token_metadata: TokenMetadata,
        amount: Balance,
    ) -> Token {
        // Only the owner of the MT contract can perform this operation
        assert_eq!(
            env::predecessor_account_id(),
            self.tokens.owner_id,
            "Unauthorized: {} != {}",
            env::predecessor_account_id(),
            self.tokens.owner_id
        );

        assert!(
            token_metadata.extra.is_some(),
            "Token attributes are required"
        );

        let token = self.token_id_by_attrs(MTContract::convert_attributes(
            token_metadata.extra.clone().unwrap(),
        ));

        if token.is_some() {
            self.tokens.internal_mint_existing(
                token_owner_id,
                token.unwrap(),
                amount,
                Some(env::signer_account_id()),
            )
        } else {
            self.tokens.internal_mint(
                token_owner_id,
                Some(amount),
                Some(token_metadata),
                Some(env::signer_account_id()),
            )
        }
    }

    #[payable]
    pub fn mt_burn(
        &mut self,
        token_owner_id: AccountId,
        token_id: TokenId,
        amount: Balance,
        memo: Option<String>,
    ) {
        // Only the owner of the MT contract can perform this operation
        assert_eq!(
            env::predecessor_account_id(),
            self.tokens.owner_id,
            "Unauthorized: {} != {}",
            env::predecessor_account_id(),
            self.tokens.owner_id
        );

        self.tokens
            .internal_burn(token_owner_id, token_id, amount, memo);
    }

    pub fn register(&mut self, token_id: TokenId, account_id: AccountId) {
        self.tokens
            .internal_register_account(&token_id, &account_id);
    }
}

crate::impl_multi_token_core!(MTContract, tokens);
crate::impl_multi_token_approval!(MTContract, tokens);
crate::impl_multi_token_enumeration!(MTContract, tokens);
#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests;

use crate::*;
use near_contract_standards::non_fungible_token::{Token, TokenId};
// trait near_contract_standards::non_fungible_token::core::NonFungibleTokenCore {}
use near_sdk::{env, ext_contract, json_types::U128, near_bindgen, AccountId, PromiseOrValue};
#[ext_contract(ext_self)]
pub trait StakeResolver {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String);

    fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: TokenId,
        msg: String,
    );

    fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_ids: Vec<AccountId>,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        msg: String,
    );
}
#[ext_contract(ext_mt_contract)]
pub trait MTContract {
    fn mt_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        amount: U128,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128>;

    fn mt_balance_of(&self, account_id: AccountId, token_id: TokenId) -> U128;
}

#[ext_contract(ext_ft_contract)]
pub trait FTContract {
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128>;

    fn ft_balance_of(&self, account_id: AccountId) -> U128;
}

#[ext_contract(ext_nft_contract)]
pub trait NFTContract {
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool>;

    fn nft_token(&self, token_id: TokenId) -> Option<Token>;
}

#[near_bindgen]
impl StakeResolver for Contract {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) {
        let contract_id = env::signer_account_id();

        let mut stake_id = StakeId {
            contract_id,
            balance: Some(amount.0),

            token_id: None,
        };

        let pool_id = match self.stake_pools.get(&msg) {
            Some(pool) => Some(msg.to_owned()),

            None => None,
        };

        let mut acc_stakes = self.stakes.get(&sender_id).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::StakesPerOwner {
                account_hash: hash_account_id(&sender_id),
            })
        });

        acc_stakes.insert(&(stake_id, pool_id));

        self.stakes.insert(&sender_id, &acc_stakes);
    }

    fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: TokenId,
        msg: String,
    ) {
        let contract_id = env::signer_account_id();

        let mut stake_id = StakeId {
            contract_id,
            balance: None,
            token_id: Some(token_id),
        };

        let pool_id = match &self.stake_pools.get(&msg) {
            Some(pool) => Some(msg.to_owned()),

            None => None,
        };

        let mut acc_stakes = self.stakes.get(&sender_id).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::StakesPerOwner {
                account_hash: hash_account_id(&sender_id),
            })
        });

        acc_stakes.insert(&(stake_id, pool_id));

        self.stakes.insert(&sender_id, &acc_stakes);
    }

    fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_ids: Vec<AccountId>,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        msg: String,
    ) {
        let contract_id = env::signer_account_id();

        let mut acc_stakes = self.stakes.get(&sender_id).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::StakesPerOwner {
                account_hash: hash_account_id(&sender_id),
            })
        });

        let pool_id = match self.stake_pools.get(&msg) {
            Some(pool) => Some(msg.to_owned()),

            None => None,
        };

        for (i, token_id) in token_ids.iter().enumerate() {
            let mut stake_id = StakeId {
                contract_id,
                balance: Some(amounts[i].0),
                token_id: Some(token_id.to_string()),
            };

            acc_stakes.insert(&(stake_id.to_owned(), pool_id.to_owned()));
        }

        self.stakes.insert(&sender_id, &acc_stakes);
    }
}

use near_contract_standards::non_fungible_token::{Token, TokenId};
// trait near_contract_standards::non_fungible_token::core::NonFungibleTokenCore {}
use near_sdk::{ext_contract, json_types::U128, AccountId, PromiseOrValue};

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

    fn resolve_stake(
        &mut self,
        pool_id: crate::staking::PoolId,
        staker_id: AccountId,
        stake_index: usize,
        promise_index: u64,
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

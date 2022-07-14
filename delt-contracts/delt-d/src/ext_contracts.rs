use near_contract_standards::non_fungible_token::TokenId;
// trait near_contract_standards::non_fungible_token::core::NonFungibleTokenCore {}
use near_sdk::{ext_contract, json_types::U128, AccountId, PromiseOrValue};

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
}

#[ext_contract(ext_ft_contract)]
pub trait FTContract {
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128>;
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
}

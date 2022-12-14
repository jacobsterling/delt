use crate::{
    staking::{Staking, TokenType},
    *,
};
use near_contract_standards::non_fungible_token::{Token, TokenId};
// trait near_contract_standards::non_fungible_token::core::NonFungibleTokenCore {}
use near_sdk::{
    env, ext_contract, json_types::U128, near_bindgen, serde_json::from_slice, AccountId,
    PromiseOrValue, PromiseResult,
};
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

    fn resolve_transfer(&mut self, stake_id: StakeId, staker_id: AccountId);
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
    fn resolve_transfer(&mut self, mut stake_id: StakeId, staker_id: AccountId) {
        require!(
            env::signer_account_id() == env::current_account_id(),
            "Restricted function"
        );

        match env::promise_result(0) {
            PromiseResult::NotReady => env::abort(),
            PromiseResult::Successful(value) => {
                if let Ok(unused_amount) = from_slice::<Vec<U128>>(&value) {
                    if let Some(transferred) = stake_id.token.remove_amount(unused_amount[0].0) {
                        stake_id.token = transferred;
                    };
                };

                self.unregister_stake(stake_id, staker_id, None);
            }
            // If promise chain fails, undo all the transfers.
            PromiseResult::Failed => {}
        }
    }

    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, _msg: String) {
        self.register_stake(
            StakeId {
                contract_id: env::signer_account_id(),
                token: TokenType::FT { balance: amount.0 },
            },
            sender_id,
        )
    }

    fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        _previous_owner_id: AccountId,
        token_id: TokenId,
        _msg: String,
    ) {
        self.register_stake(
            StakeId {
                contract_id: env::signer_account_id(),
                token: TokenType::NFT { token_id },
            },
            sender_id,
        );
    }

    fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        _previous_owner_ids: Vec<AccountId>,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        _msg: String,
    ) {
        for (i, token_id) in token_ids.iter().enumerate() {
            self.register_stake(
                StakeId {
                    contract_id: env::signer_account_id(),
                    token: TokenType::MT {
                        token_id: token_id.to_string(),
                        balance: amounts[i].0,
                    },
                },
                sender_id.to_owned(),
            )
        }
    }
}

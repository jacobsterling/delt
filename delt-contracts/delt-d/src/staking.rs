use std::collections::HashMap;

use crate::ext_contracts::{
    ext_ft_contract, ext_mt_contract, ext_nft_contract, ext_self, StakeResolver,
};

use crate::*;
use near_contract_standards::non_fungible_token::{Token, TokenId};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::env::log_str;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::serde_json::from_slice;
use near_sdk::{
    near_bindgen, require, AccountId, Balance, Gas, Promise, PromiseError, PromiseResult,
};
#[derive(Deserialize, Serialize, BorshDeserialize, BorshSerialize)]
pub struct Pool {
    players: Vec<AccountId>,

    player_stakes: Option<HashMap<AccountId, Vec<Stake>>>,
}

#[derive(Deserialize, Serialize, BorshDeserialize, BorshSerialize)]
pub struct Stake {
    contract_id: AccountId,

    // for nft or mt contracts, should be left as none for fungable token
    token_id: Option<TokenId>,

    //should be left as none for nft's
    balance: Option<Balance>,

    staked: bool,
}

pub type PoolId = String;

pub const BASIC_GAS: Gas = Gas(5_000_000_000_000);
const GAS_FOR_TRANSFER_CALL: Gas = Gas(25_000_000_000_000 + BASIC_GAS.0);

const NO_DEPOSIT: Balance = 0;

pub trait Staking {
    fn deathmatch(&mut self, pool_id: PoolId, player_stakes: Vec<(AccountId, Vec<Stake>)>);

    fn end_deathmatch(&mut self, pool_id: PoolId);

    fn dungeon(&mut self, pool_id: PoolId, player_ids: Vec<AccountId>);

    fn end_dungeon(&mut self, pool_id: PoolId);

    fn validate_stakes(&mut self, pool_id: PoolId) -> bool;
}

#[near_bindgen]
impl Staking for Contract {
    fn deathmatch(&mut self, pool_id: PoolId, player_stakes: Vec<(AccountId, Vec<Stake>)>) {
        require!(
            player_stakes.len() > 1,
            "More than 1 player required for deathmatch"
        );
    }

    fn validate_stakes(&mut self, pool_id: PoolId) -> bool {
        let stake_pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Room does not exist"))
            .player_stakes
            .unwrap_or_else(|| panic!("No stakes"));

        let mut promise_index: u64 = 0;
        for (staker_id, stakes) in stake_pool.into_iter() {
            for (stake_index, stake) in stakes.into_iter().enumerate() {
                if !stake.staked {
                    if let Some(token_id) = stake.token_id {
                        if stake.balance.is_some() {
                            ext_mt_contract::ext(stake.contract_id)
                                .mt_balance_of(env::current_account_id(), token_id)
                                .then(ext_self::ext(env::current_account_id()).resolve_stake(
                                    pool_id.clone(),
                                    staker_id,
                                    stake_index,
                                    promise_index.clone(),
                                ));
                            promise_index += 1;
                            return false;
                        } else {
                            ext_nft_contract::ext(stake.contract_id)
                                .nft_token(token_id)
                                .then(ext_self::ext(env::current_account_id()).resolve_stake(
                                    pool_id.clone(),
                                    staker_id,
                                    stake_index,
                                    promise_index.clone(),
                                ));
                            promise_index += 1;
                            return false;
                        }
                    } else {
                        ext_ft_contract::ext(stake.contract_id)
                            .ft_balance_of(env::current_account_id())
                            .then(ext_self::ext(env::current_account_id()).resolve_stake(
                                pool_id.clone(),
                                staker_id,
                                stake_index,
                                promise_index.clone(),
                            ));
                        promise_index += 1;
                        return false;
                    }
                }
            }
        }
        true
    }

    fn end_deathmatch(&mut self, pool_id: PoolId) {}

    fn dungeon(&mut self, pool_id: PoolId, player_ids: Vec<AccountId>) {}

    fn end_dungeon(&mut self, pool_id: PoolId) {}
}

#[near_bindgen]
impl StakeResolver for Contract {
    fn resolve_stake(
        &mut self,
        pool_id: PoolId,
        staker_id: AccountId,
        stake_index: usize,
        promise_index: u64,
    ) {
        require!(
            env::promise_results_count() > promise_index,
            "This is a callback method"
        );

        assert!(
            env::signer_account_id() == env::current_account_id(),
            "Self callback function"
        );

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Room does not exist"));

        let mut stakes = pool
            .player_stakes
            .unwrap_or_else(|| panic!("No stakes"))
            .get_mut(&staker_id)
            .unwrap();

        let mut stake = stakes.get_mut(stake_index).unwrap();

        stake.staked = match env::promise_result(promise_index) {
            PromiseResult::NotReady => unreachable!(),
            PromiseResult::Failed => false,
            PromiseResult::Successful(result) => {
                if let Some(token_id) = stake.token_id {
                    if let Some(balance) = stake.balance {
                        if from_slice::<U128>(&result).unwrap().0 >= balance {
                            true
                        } else {
                            false
                        }
                    } else {
                        if from_slice::<Token>(&result).unwrap().owner_id
                            == env::current_account_id()
                        {
                            true
                        } else {
                            false
                        }
                    }
                } else {
                    let Some(ft_stake_amount) = stake.balance;
                    if from_slice::<U128>(&result).unwrap().0 >= ft_stake_amount {
                        true
                    } else {
                        false
                    }
                }
            }
        };
    }

    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) {
        require!(
            env::promise_results_count() == 1,
            "This is a callback method"
        );

        let msg_result: Vec<&str> = msg.split(" ").collect();

        assert!(msg_result.len() != 3);

        let pool_id: PoolId = msg_result[0].to_owned();
        let staker_id: AccountId = msg_result[1].to_owned().parse().unwrap();
        let stake_index: usize = msg_result[2].to_owned().parse().unwrap();

        let pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Room does not exist"));

        let stakes = pool
            .player_stakes
            .unwrap_or_else(|| panic!("No stakes"))
            .get_mut(&staker_id)
            .unwrap();

        let mut stake = stakes.get_mut(stake_index).unwrap();

        assert!(
            env::signer_account_id() == stake.contract_id,
            "Unexpected Caller"
        );

        // handle the result from the cross contract& call this method is a callback for
        stake.staked = match env::promise_result(0) {
            PromiseResult::NotReady => unreachable!(),
            PromiseResult::Failed => false,
            PromiseResult::Successful(result) => {
                if from_slice::<U128>(&result).unwrap().0 >= stake.balance.unwrap() {
                    true
                } else {
                    false
                }
            }
        };
    }

    fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: TokenId,
        msg: String,
    ) {
        require!(
            env::promise_results_count() == 1,
            "This is a callback method"
        );

        let msg_result: Vec<&str> = msg.split(" ").collect();

        assert!(msg_result.len() != 3);

        let pool_id: PoolId = msg_result[0].to_owned();
        let staker_id: AccountId = msg_result[1].to_owned().parse().unwrap();
        let stake_index: usize = msg_result[2].to_owned().parse().unwrap();

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Room does not exist"));

        let mut stakes = pool
            .player_stakes
            .unwrap_or_else(|| panic!("No stakes"))
            .get_mut(&staker_id)
            .unwrap();

        let mut stake = stakes.get_mut(stake_index).unwrap();

        assert!(
            env::signer_account_id() == stake.contract_id,
            "Unexpected Caller"
        );

        // handle the result from the cross contract& call this method is a callback for
        stake.staked = match env::promise_result(0) {
            PromiseResult::NotReady => unreachable!(),
            PromiseResult::Failed => false,
            PromiseResult::Successful(result) => {
                if from_slice::<U128>(&result).unwrap().0 >= stake.balance.unwrap() {
                    true
                } else {
                    false
                }
            }
        };
    }

    fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_ids: Vec<AccountId>,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        msg: String,
    ) {
        require!(
            env::promise_results_count() == 1,
            "This is a callback method"
        );

        let msg_result: Vec<&str> = msg.split(" ").collect();

        assert!(msg_result.len() != 3);

        let pool_id: PoolId = msg_result[0].to_owned();
        let staker_id: AccountId = msg_result[1].to_owned().parse().unwrap();
        let stake_index: usize = msg_result[2].to_owned().parse().unwrap();

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Room does not exist"));

        let mut stakes = pool
            .player_stakes
            .unwrap_or_else(|| panic!("No stakes"))
            .get_mut(&staker_id)
            .unwrap();

        let mut stake = stakes.get_mut(stake_index).unwrap();

        assert!(
            env::signer_account_id() == stake.contract_id,
            "Unexpected Caller"
        );

        // handle the result from the cross contract& call this method is a callback for
        stake.staked = match env::promise_result(0) {
            PromiseResult::NotReady => unreachable!(),
            PromiseResult::Failed => false,
            PromiseResult::Successful(result) => {
                if from_slice::<U128>(&result).unwrap().0 >= stake.balance.unwrap() {
                    true
                } else {
                    false
                }
            }
        };
    }
}

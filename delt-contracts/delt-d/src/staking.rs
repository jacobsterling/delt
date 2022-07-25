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
    player_stakes: HashMap<AccountId, Vec<Stake>>,

    pool_results: Vec<AccountId>,

    active: bool,

    pvp: bool,
}

#[derive(Deserialize, Serialize, BorshDeserialize, BorshSerialize)]
pub struct Stake {
    pub contract_id: AccountId,

    // for nft or mt contracts, should be left as none for fungable token
    pub token_id: Option<TokenId>,

    //should be left as none for nft's
    pub balance: Option<Balance>,

    //key represents pool result and value is receiver of the stake given the result
    pub potential_recievers: Vec<(AccountId, AccountId)>,

    pub staked_on_result: AccountId,

    pub staked: bool,
}

pub type PoolId = String;

pub const BASIC_GAS: Gas = Gas(5_000_000_000_000);
const GAS_FOR_TRANSFER_CALL: Gas = Gas(25_000_000_000_000 + BASIC_GAS.0);
const NO_DEPOSIT: Balance = 0;

pub trait Staking {
    fn create_stake_pool(
        &mut self,
        pool_id: PoolId,
        stakes: Vec<(AccountId, Vec<Stake>)>,
        pool_results: Vec<AccountId>,
        pvp: bool,
    );

    fn resolve_stake_pool(&mut self, pool_id: PoolId, stake_result: Option<AccountId>);

    fn validate_stakes(&self, pool_id: PoolId) -> bool;

    fn transfer_stake(
        &self,
        pool_id: PoolId,
        staker_id: AccountId,
        receiver_id: AccountId,
        index: usize,
    );

    fn verify_stake(
        &self,
        pool_id: PoolId,
        staker_id: AccountId,
        check_staker: bool,
        index: usize,
    ) -> Promise;

    fn assert_stake(
        &mut self,
        pool_id: PoolId,
        staker_id: AccountId,
        index: usize,
        assertion: bool,
    );

    fn get_pool(&self, pool_id: PoolId) -> Pool;

    fn toggle_pool(&mut self, pool_id: PoolId, toggle: bool);
}

#[near_bindgen]
impl Staking for Contract {
    fn create_stake_pool(
        &mut self,
        pool_id: PoolId,
        stakes: Vec<(AccountId, Vec<Stake>)>,
        pool_results: Vec<AccountId>,
        pvp: bool,
    ) {
        require!(
            self.stake_pools.get(&pool_id).is_none(),
            "pool_id already exists"
        );

        let mut player_stakes: HashMap<AccountId, Vec<Stake>> = HashMap::new();

        for (player_id, _stakes) in stakes.into_iter() {
            for stake in _stakes.iter() {
                assert!(
                    pool_results.contains(&stake.staked_on_result),
                    "Given stake result not in pool results"
                );

                assert!(stake
                    .potential_recievers
                    .iter()
                    .any(|(result, receiver)| pool_results.contains(&result)
                        && receiver != &player_id));
            }
            player_stakes.insert(player_id.clone(), _stakes);
        }

        let new_pool = Pool {
            player_stakes,
            active: false,
            pool_results,
            pvp,
        };

        if self.stake_pools.insert(&pool_id, &new_pool).is_some() {
            panic!("Pool id already exists");
        }
    }

    fn validate_stakes(&self, pool_id: PoolId) -> bool {
        let pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        let mut result: Vec<bool> = Vec::new();
        for (_, stakes) in pool.player_stakes.into_iter() {
            for stake in stakes.into_iter() {
                if !stake.staked {
                    if stake.token_id.is_some() {
                        if stake.balance.is_some() {
                            result.push(false);
                        } else {
                            result.push(false);
                        }
                    } else {
                        result.push(false);
                    }
                }
            }
        }

        if result.len() > 0 {
            return result.into_iter().any(|x| x);
        } else {
            return true;
        };
        //self.stake_pools.insert(&pool_id, &stake_pool);
    }

    fn resolve_stake_pool(&mut self, pool_id: PoolId, stake_result: Option<AccountId>) {
        assert!(env::signer_account_id() == env::current_account_id());

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        assert!(pool.active, "Pool is not active");

        if let Some(result) = stake_result {
            assert!(
                pool.pool_results.contains(&result),
                "Result not contained in pool results"
            );

            for (player, stakes) in pool.player_stakes.into_iter() {
                for (index, stake) in stakes.into_iter().enumerate() {
                    if result != stake.staked_on_result && stake.staked {
                        for (_, receiver) in stake
                            .potential_recievers
                            .into_iter()
                            .filter(|(stake_result, _)| stake_result == &result)
                        {
                            self.transfer_stake(pool_id.clone(), player.clone(), receiver, index);
                            break;
                        }
                    }
                }
            }
        }

        pool.active = false;
    }

    fn transfer_stake(
        &self,
        pool_id: PoolId,
        staker_id: AccountId,
        receiver_id: AccountId,
        index: usize,
    ) {
        assert!(env::signer_account_id() == env::current_account_id());

        let pool = self.get_pool(pool_id.clone());

        let stakes = pool
            .player_stakes
            .get(&staker_id)
            .unwrap_or_else(|| panic!("Staker does not exist"));

        let stake = stakes
            .get(index)
            .unwrap_or_else(|| panic!("Staker does not exist"));

        if let Some(token_id) = &stake.token_id {
            if let Some(balance) = stake.balance {
                ext_mt_contract::ext(stake.contract_id.to_owned()).mt_transfer_call(
                    receiver_id,
                    token_id.to_owned(),
                    U128(balance),
                    None,
                    Some("Delt Stake".to_string()),
                    format!("{} {}", pool_id, index),
                );
            } else {
                ext_nft_contract::ext(stake.contract_id.to_owned()).nft_transfer_call(
                    receiver_id,
                    token_id.to_owned(),
                    None,
                    Some("Delt stake".to_string()),
                    format!("{} {}", pool_id, index),
                );
            }
        } else {
            ext_ft_contract::ext(stake.contract_id.to_owned()).ft_transfer_call(
                receiver_id,
                U128(stake.balance.unwrap()),
                Some("Delt stake".to_string()),
                format!("{} {}", pool_id, index),
            );
        }
    }

    fn verify_stake(
        &self,
        pool_id: PoolId,
        staker_id: AccountId,
        check_staker: bool,
        index: usize,
    ) -> Promise {
        let pool = self.get_pool(pool_id);

        let stake_owner = if check_staker {
            staker_id.clone()
        } else {
            env::current_account_id()
        };

        let stakes = pool
            .player_stakes
            .get(&staker_id)
            .unwrap_or_else(|| panic!("Staker does not exist"));

        let stake = stakes
            .get(index)
            .unwrap_or_else(|| panic!("Staker does not exist"));

        if let Some(token_id) = &stake.token_id {
            if stake.balance.is_some() {
                ext_mt_contract::ext(stake.contract_id.to_owned())
                    .mt_balance_of(stake_owner, token_id.to_owned())
            } else {
                ext_nft_contract::ext(stake.contract_id.to_owned()).nft_token(token_id.to_owned())
            }
        } else {
            ext_ft_contract::ext(stake.contract_id.to_owned()).ft_balance_of(stake_owner)
        }
    }

    fn assert_stake(
        &mut self,
        pool_id: PoolId,
        staker_id: AccountId,
        index: usize,
        assertion: bool,
    ) {
        assert!(env::signer_account_id() == env::current_account_id());

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        let stakes = pool
            .player_stakes
            .get_mut(&staker_id)
            .unwrap_or_else(|| panic!("Staker does not exist"));

        let mut stake = stakes
            .get_mut(index)
            .unwrap_or_else(|| panic!("Index does not exist"));

        stake.staked = assertion;
    }

    fn get_pool(&self, pool_id: PoolId) -> Pool {
        self.stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"))
    }

    fn toggle_pool(&mut self, pool_id: PoolId, toggle: bool) {
        assert!(env::signer_account_id() == env::current_account_id());

        self.stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"))
            .active = toggle;
    }
}

#[near_bindgen]
impl StakeResolver for Contract {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) {
        let caller_id = env::signer_account_id();

        let mut pool = self
            .stake_pools
            .get(&msg)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        if let Some(stakes) = pool.player_stakes.get_mut(&sender_id) {
            for stake in stakes.into_iter().filter(|_stake| {
                _stake.contract_id == caller_id.clone()
                    && _stake.token_id.is_none()
                    && _stake.balance.is_some()
            }) {
                if stake.balance.unwrap() == amount.0 {
                    stake.staked = true;
                    break;
                }
            }
        }
    }

    fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: TokenId,
        msg: String,
    ) {
        let caller_id = env::signer_account_id();

        let mut pool = self
            .stake_pools
            .get(&msg)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        if let Some(stakes) = pool.player_stakes.get_mut(&previous_owner_id) {
            for stake in stakes.into_iter().filter(|_stake| {
                _stake.contract_id == caller_id.clone()
                    && _stake.token_id.is_some()
                    && _stake.balance.is_none()
            }) {
                if stake.token_id.as_ref().unwrap() == &token_id {
                    stake.staked = true;
                    break;
                }
            }
        }
    }

    fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_ids: Vec<AccountId>,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        msg: String,
    ) {
        let caller_id = env::signer_account_id();

        let mut pool = self
            .stake_pools
            .get(&msg)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        assert!(token_ids.len() == previous_owner_ids.len() && token_ids.len() == amounts.len());

        for (i, staker_id) in previous_owner_ids.into_iter().enumerate() {
            if let Some(stakes) = pool.player_stakes.get_mut(&staker_id) {
                for stake in stakes
                    .into_iter()
                    .filter(|_stake| _stake.contract_id == caller_id.clone())
                {
                    if let (Some(token_id), Some(balance)) =
                        (stake.token_id.as_ref(), stake.balance)
                    {
                        if token_id == &token_ids[i] && balance == amounts[i].0 {
                            stake.staked = true;
                        }
                    }
                }
            }
        }
    }
}

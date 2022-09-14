use std::collections::HashMap;

use crate::ext_contracts::{ext_ft_contract, ext_mt_contract, ext_nft_contract};

use crate::*;
use near_contract_standards::non_fungible_token::{refund_deposit_to_account, TokenId};
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    env::panic_str,
    near_bindgen, require,
    serde::{Deserialize, Serialize},
    AccountId, Balance, Gas, Promise,
};
#[derive(Deserialize, Serialize, BorshDeserialize, BorshSerialize, Debug)]
pub struct Pool {
    pub stakers: HashMap<AccountId, Stakes>,

    pub pool_results: Vec<AccountId>,

    pub active: bool,

    pub pvp: bool,
}

impl Pool {
    fn new(
        initial_stakes: Vec<(AccountId, Stakes)>,
        pool_results: Vec<AccountId>,
        pvp: bool,
    ) -> Self {
        let stakers = HashMap::new();

        for (staker, stakes) in initial_stakes {
            stakers.insert(staker, stakes);
        }

        Self {
            active: false,
            pool_results,
            pvp,
            stakers,
        }
    }
}

#[derive(Deserialize, Serialize, BorshDeserialize, BorshSerialize, Debug, Clone, PartialEq)]
//used to identify stakes from NFT, MT & FT contracts
pub struct StakeId {
    pub contract_id: AccountId,

    // for nft or mt contracts, should be left as none for fungable token
    pub token_id: Option<TokenId>,

    //should be left as none for nft's
    pub balance: Option<Balance>,
}

#[derive(Deserialize, Serialize, BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct Stakes {
    pub stakes: Vec<StakeId>,

    //key represents pool result and value is receiver of the stake given the result
    pub potential_recievers: Vec<(AccountId, AccountId)>,

    pub staked_on_result: AccountId,
}

pub type PoolId = String;

pub const BASIC_GAS: Gas = Gas(5_000_000_000_000);
const GAS_FOR_TRANSFER_CALL: Gas = Gas(25_000_000_000_000 + BASIC_GAS.0);
const NO_DEPOSIT: Balance = 0;

pub trait Staking {
    fn create_stake_pool(
        &mut self,
        pool_id: PoolId,
        pool_results: Vec<AccountId>,
        pvp: bool,
        initial_stakes: Vec<(AccountId, Stakes)>,
    );

    fn resolve_stake_pool(&mut self, pool_id: PoolId, stake_result: Option<AccountId>);

    fn validate_stakes(&mut self, pool_id: PoolId) -> bool;

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

    fn remove_pool(&mut self, pool_id: PoolId);
}

#[near_bindgen]
impl Staking for Contract {
    fn create_stake_pool(
        &mut self,
        pool_id: PoolId,
        pool_results: Vec<AccountId>,
        pvp: bool,
        initial_stakes: Vec<(AccountId, Stakes)>,
    ) {
        let init_storage = env::storage_usage();

        if self
            .stake_pools
            .insert(&pool_id, &Pool::new(initial_stakes, pool_results, pvp))
            .is_some()
        {
            panic_str("Pool id already exists");
        }

        //refund unused storage deposit
        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );
    }

    fn validate_stakes(&mut self, pool_id: PoolId) -> bool {
        match self.stake_pools.get(&pool_id) {
            Some(pool) => {
                let mut result: Vec<bool> = Vec::new();

                for (staker, required_stakes) in pool.stakers.into_iter() {
                    if let Some(stakes) = self.stakes.get(&staker) {
                        for required_stake in required_stakes.stakes {
                            for (stake, staked_in_pool) in stakes.iter() {
                                if stake == required_stake {
                                    if let Some(id) = staked_in_pool {
                                        if id == pool_id {
                                            result.push(true);
                                            break;
                                        }
                                    } else {
                                        staked_in_pool = Some(pool_id);
                                        result.push(true);
                                        break;
                                    }
                                }
                            }

                            self.stakes.insert(&staker, &stakes);
                        }
                    } else {
                        if required_stakes.stakes.len() > 0 {
                            result.push(false);
                        }
                    }
                }

                if result.len() > 0 {
                    return result.into_iter().any(|x| x);
                } else {
                    return true;
                };
            }

            None => panic_str("Pool does not exist"),
        }

        //self.stake_pools.insert(&pool_id, &stake_pool);
    }

    fn resolve_stake_pool(&mut self, pool_id: PoolId, stake_result: Option<AccountId>) {
        assert!(env::signer_account_id() == env::current_account_id());

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        require!(pool.active, "Pool is not active");

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
        assert_eq!(env::signer_account_id(), env::current_account_id());

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
        assert_eq!(env::signer_account_id(), env::current_account_id());

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        let mut stakes = pool
            .player_stakes
            .get(&staker_id)
            .unwrap_or_else(|| panic!("Staker does not exist"))
            .clone();

        if let Some(stake) = stakes.get_mut(index) {
            stake.staked = assertion;

            pool.player_stakes.insert(staker_id, stakes);

            self.stake_pools.insert(&pool_id, &pool);
        };
    }

    fn get_pool(&self, pool_id: PoolId) -> Pool {
        self.stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"))
    }

    fn toggle_pool(&mut self, pool_id: PoolId, toggle: bool) {
        assert_eq!(env::signer_account_id(), env::current_account_id());

        let mut pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        pool.active = toggle;

        self.stake_pools.insert(&pool_id, &pool);
    }

    fn remove_pool(&mut self, pool_id: PoolId) {
        assert_eq!(env::signer_account_id(), env::current_account_id());

        let pool = self
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic!("Pool does not exist"));

        assert!(!pool.active, "Pool is active");
        assert!(
            !self.validate_stakes(pool_id.clone()),
            "Existing stakes in pool"
        );

        self.stake_pools.remove(&pool_id);
    }
}

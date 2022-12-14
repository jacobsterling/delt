use std::{
    cmp::Eq,
    collections::{HashMap, HashSet},
    hash::Hash,
    ops::Add,
};

use crate::ext_contracts::{ext_ft_contract, ext_mt_contract, ext_nft_contract, ext_self};

use crate::*;
use near_contract_standards::non_fungible_token::TokenId;
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    env::panic_str,
    near_bindgen, require,
    serde::{Deserialize, Serialize},
    AccountId, Balance, Gas, Promise,
};
use near_sdk::{env::current_account_id, IntoStorageKey};

use utils::refund_deposit_to_account;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct StakeManagement {
    pub stake_pools: UnorderedMap<PoolId, Pool>,

    stakes: LookupMap<AccountId, UnorderedMap<StakeId, Option<PoolId>>>,
}
#[derive(Serialize, Deserialize, BorshDeserialize, BorshSerialize, Debug)]
pub struct Pool {
    pub owner: AccountId,

    pub required_xp: u128,

    //pool result -> staker -> (stake / potential rewards)
    pub required_stakes: Stakes,

    // governs if the pool can receive more stakes
    pub active: bool,

    // true once all stakes have been transferred to respective player
    pub resolved: bool,

    pub result: Option<AccountId>,
}

#[derive(Serialize, Deserialize, BorshDeserialize, BorshSerialize, Debug)]
pub struct Stakes(pub HashMap<AccountId, HashMap<AccountId, HashMap<StakeId, AccountId>>>);

impl Stakes {
    pub fn new(pool_results: HashSet<AccountId>) -> Self {
        let mut stakes = HashMap::new();

        for result in pool_results {
            stakes.insert(result, HashMap::new());
        }

        Self(stakes)
    }

    pub fn add_stake(
        &mut self,
        pool_result: AccountId,
        staker: AccountId,
        stake: StakeId,
        receivers: HashMap<AccountId, AccountId>,
    ) {
        let mut added = false;

        for (result, stakes) in self.0.iter_mut() {
            if result == &pool_result {
                stakes.entry(staker.to_owned()).or_insert_with(HashMap::new);
                added = true;
            } else {
                let receiver = receivers
                    .get(&result)
                    .unwrap_or(&current_account_id())
                    .to_owned();

                require!(receiver != staker, "Staker cannot be a potential receiver");

                stakes
                    .entry(receiver)
                    .or_insert_with(HashMap::new)
                    .insert(stake.to_owned(), staker.to_owned());
            }
        }

        assert!(added, "cannot find {} in pool results", pool_result);
    }

    pub fn add_result(&mut self, pool_result: AccountId) {
        assert!(
            self.0.insert(pool_result, HashMap::new()).is_none(),
            "pool result already exists"
        );
    }
}

impl Pool {
    fn new(owner: AccountId, pool_results: HashSet<AccountId>, required_xp: u128) -> Self {
        Self {
            owner,
            required_xp,
            active: false,
            resolved: false,
            required_stakes: Stakes::new(pool_results),
            result: None,
        }
    }
}
#[derive(
    Deserialize,
    Serialize,
    BorshDeserialize,
    BorshSerialize,
    Debug,
    Clone,
    Eq,
    PartialEq,
    Hash,
    PartialOrd,
)]
pub struct StakeId {
    pub contract_id: AccountId,

    pub token: TokenType,
}

impl StakeId {
    fn transfer(&self, receiver_id: AccountId, msg: String, amount: Option<u128>) {
        //remaining amount
        match &self.token {
            TokenType::NFT { token_id } => {
                ext_nft_contract::ext(self.contract_id.to_owned())
                    .nft_transfer_call(
                        receiver_id.to_owned(),
                        token_id.to_owned(),
                        None,
                        Some("Delt stake".to_string()),
                        msg,
                    )
                    .then(
                        ext_self::ext(env::current_account_id())
                            .resolve_transfer(self.to_owned(), receiver_id),
                    );
            }
            TokenType::FT { balance } => {
                let transfer_amount = amount.unwrap_or(balance.to_owned());

                require!(
                    &transfer_amount <= balance,
                    "Transfer amount given exceeds registered balance"
                );

                ext_ft_contract::ext(self.contract_id.to_owned())
                    .ft_transfer_call(
                        receiver_id.to_owned(),
                        U128(transfer_amount),
                        Some("Delt stake".to_string()),
                        msg,
                    )
                    .then(
                        ext_self::ext(env::current_account_id())
                            .resolve_transfer(self.to_owned(), receiver_id),
                    );
            }
            TokenType::MT { token_id, balance } => {
                let transfer_amount = amount.unwrap_or(balance.to_owned());

                require!(
                    &transfer_amount <= balance,
                    "Transfer amount given exceeds registered balance"
                );

                ext_mt_contract::ext(self.contract_id.to_owned())
                    .mt_transfer_call(
                        receiver_id.to_owned(),
                        token_id.to_owned(),
                        U128(transfer_amount),
                        None,
                        Some("Delt Stake".to_string()),
                        msg,
                    )
                    .then(
                        ext_self::ext(env::current_account_id())
                            .resolve_transfer(self.to_owned(), receiver_id),
                    );
            }
        }
    }

    fn verify(&self, account_id: AccountId) -> Promise {
        match &self.token {
            TokenType::NFT { token_id } => {
                ext_nft_contract::ext(self.contract_id.to_owned()).nft_token(token_id.to_owned())
            }

            TokenType::FT { .. } => {
                ext_ft_contract::ext(self.contract_id.to_owned()).ft_balance_of(account_id)
            }

            TokenType::MT { token_id, .. } => ext_mt_contract::ext(self.contract_id.to_owned())
                .mt_balance_of(account_id, token_id.to_owned()),
        }
    }
}

#[derive(
    Deserialize,
    Serialize,
    BorshDeserialize,
    BorshSerialize,
    Debug,
    Clone,
    Eq,
    Hash,
    PartialEq,
    PartialOrd,
)]
pub enum TokenType {
    NFT { token_id: TokenId },
    FT { balance: u128 },
    MT { token_id: TokenId, balance: u128 },
}

impl TokenType {
    fn eq_type(&self, other: &Self) -> bool {
        match self {
            Self::NFT { .. } => match other {
                Self::NFT { .. } => true,

                _ => false,
            },
            Self::FT { .. } => match other {
                Self::FT { .. } => true,

                _ => false,
            },
            Self::MT { .. } => match other {
                Self::MT { .. } => true,

                _ => false,
            },
        }
    }

    fn get_amount(&self) -> Option<&u128> {
        match self {
            Self::NFT { .. } => None,
            Self::FT { balance } => Some(balance),
            Self::MT { balance, .. } => Some(balance),
        }
    }

    pub fn add_amount(&self, amount: u128) -> Option<Self> {
        match self {
            Self::FT { balance } => match balance.checked_add(amount) {
                Some(new_balance) => Some(Self::FT {
                    balance: new_balance,
                }),

                None => None,
            },

            Self::MT { token_id, balance } => match balance.checked_add(amount) {
                Some(new_balance) => Some(Self::MT {
                    balance: new_balance,
                    token_id: token_id.to_string(),
                }),

                None => None,
            },

            _ => None,
        }
    }

    pub fn remove_amount(&self, amount: u128) -> Option<Self> {
        match self {
            Self::FT { balance } => match balance.checked_sub(amount) {
                Some(new_balance) => Some(Self::FT {
                    balance: new_balance,
                }),

                None => None,
            },

            Self::MT { token_id, balance } => match balance.checked_sub(amount) {
                Some(new_balance) => Some(Self::MT {
                    balance: new_balance,
                    token_id: token_id.to_string(),
                }),

                None => None,
            },

            _ => None,
        }
    }
}

pub type PoolId = String;

pub const BASIC_GAS: Gas = Gas(5_000_000_000_000);
const GAS_FOR_TRANSFER_CALL: Gas = Gas(25_000_000_000_000 + BASIC_GAS.0);
const NO_DEPOSIT: Balance = 0;

pub trait Staking {
    fn create_pool(
        &mut self,
        pool_id: PoolId,
        pool_results: HashSet<AccountId>,
        required_xp: u128,
    ) -> Pool;

    fn stake(
        &mut self,
        stake_id: StakeId,
        staker_id: AccountId,
        pool_result: AccountId,
        pool_id: PoolId,
        receivers: HashMap<AccountId, AccountId>,
    );

    fn unstake(&mut self, stake_id: StakeId, staker_id: AccountId);

    fn register_stake(&mut self, stake_id: StakeId, staker_id: AccountId);

    fn unregister_stake(
        &mut self,
        stake_id: StakeId,
        staker_id: AccountId,
        reregister: Option<AccountId>,
    );

    fn transfer_stake(&self, stake_id: StakeId, receiver_id: AccountId, amount: Option<u128>);

    fn get_stakes(&self, staker_id: AccountId) -> Vec<(StakeId, Option<PoolId>)>;

    fn verify_stake(&self, stake_id: StakeId, check_id: Option<AccountId>) -> Promise;

    fn get_pools(&self, owner: Option<AccountId>) -> HashMap<PoolId, Pool>;

    fn toggle_pool_active(&mut self, pool_id: PoolId, toggle: bool);

    fn assert_pool_result(&mut self, pool_id: PoolId, pool_result: Option<AccountId>);

    fn distribute_stakes(&mut self, pool_id: PoolId);

    fn remove_pool(&mut self, pool_id: PoolId);
}

#[near_bindgen]
impl Staking for Contract {
    #[payable]
    fn create_pool(
        &mut self,
        pool_id: PoolId,
        pool_results: HashSet<AccountId>,
        required_xp: u128,
    ) -> Pool {
        require!(
            self.accounts
                .characters
                .get(&env::signer_account_id())
                .is_some(),
            "Account is not registered"
        );

        let init_storage = env::storage_usage();

        let pool = Pool::new(env::signer_account_id(), pool_results, required_xp);

        if self.staking.stake_pools.insert(&pool_id, &pool).is_some() {
            panic_str("Pool id already exists");
        }

        //refund unused storage deposit
        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );

        pool
    }

    #[payable]
    fn stake(
        &mut self,
        stake_id: StakeId,
        staker_id: AccountId,
        pool_result: AccountId,
        pool_id: PoolId,
        receivers: HashMap<AccountId, AccountId>,
    ) {
        require!(
            env::signer_account_id() == self.owner || env::signer_account_id() == staker_id,
            "Restricted function"
        );

        let init_storage = env::storage_usage();

        let mut pool = self
            .staking
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic_str("given pool id does not exist"));

        require!(!pool.active, "Pool is already active");

        pool.required_stakes.add_stake(
            pool_result,
            staker_id.to_owned(),
            stake_id.to_owned(),
            receivers,
        );

        self.staking.stake_pools.insert(&pool_id, &pool);

        match self.staking.stakes.get(&staker_id) {
            Some(mut stakes) => {
                match stakes.insert(&stake_id, &Some(pool_id)) {
                    Some(existing) => {
                        if let Some(existing_pool) = existing {
                            panic_str(&format!("Stake already staked in pool: {}", existing_pool));
                        }
                    }

                    None => panic_str("Stake is not registered"),
                }

                self.staking.stakes.insert(&staker_id, &stakes);
            }

            None => panic_str("Account is not registered"),
        }

        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );
    }

    fn unstake(&mut self, stake_id: StakeId, staker_id: AccountId) {
        require!(
            env::signer_account_id() == self.owner || env::signer_account_id() == staker_id,
            "Restricted function"
        );

        match self.staking.stakes.get(&staker_id) {
            Some(stakes) => {
                match stakes.get(&stake_id) {
                    Some(existing_pool) => {
                        if let Some(pool_id) = existing_pool {
                            panic_str(&format!("Still staked in pool: {}", pool_id));
                        }

                        stake_id.transfer(
                            staker_id.to_owned(),
                            current_account_id().to_string(),
                            None,
                        );
                    }

                    None => {
                        let mut transfered = false;

                        if let Some(transfer_amount) = stake_id.token.get_amount() {
                            for (stake, _) in stakes.iter().filter(|(stake, existing_pool)| {
                                stake.token.eq_type(&stake_id.token)
                                    && existing_pool.is_none()
                                    && stake_id.contract_id == stake.contract_id
                            }) {
                                stake.transfer(
                                    staker_id.to_owned(),
                                    current_account_id().to_string(),
                                    Some(transfer_amount.to_owned()),
                                );

                                transfered = true;
                                break;
                            }
                        }

                        if !transfered {
                            panic_str("Stake is not registered")
                        }
                    }
                }

                self.staking.stakes.insert(&staker_id, &stakes);
            }

            None => panic_str("Account is not registered"),
        }
    }

    #[payable]
    fn register_stake(&mut self, mut stake_id: StakeId, staker_id: AccountId) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let init_storage = env::storage_usage();

        match self.staking.stakes.get(&staker_id) {
            Some(mut stakes) => {
                if let Some(merge_amount) = stake_id.token.get_amount() {
                    for (stake, _) in stakes.iter().filter(|(stake, existing_pool)| {
                        stake.token.eq_type(&stake_id.token)
                            && existing_pool.is_none()
                            && stake_id.contract_id == stake.contract_id
                    }) {
                        if let Some(merged) = stake_id.token.add_amount(merge_amount.to_owned()) {
                            stake_id.token = merged;
                            stakes.remove(&stake);
                            break;
                        }
                    }
                }

                stakes.insert(&stake_id, &None);

                self.staking.stakes.insert(&staker_id, &stakes);
            }

            None => panic_str("Account not registered"),
        }

        refund_deposit_to_account(
            env::storage_usage() - init_storage,
            env::signer_account_id(),
        );
    }

    fn unregister_stake(
        &mut self,
        stake_id: StakeId,
        staker_id: AccountId,
        reregister: Option<AccountId>,
    ) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        match self.staking.stakes.get(&staker_id) {
            Some(mut stakes) => {
                let mut unstaked = false;

                match stakes.remove(&stake_id) {
                    Some(pool) => {
                        if let Some(pool_id) = pool {
                            panic_str(&format!("Stake is staked in pool: {}", pool_id));
                        }
                        unstaked = true;
                    }

                    None => {
                        if let Some(unstake_amount) = stake_id.token.get_amount() {
                            for (mut stake, _) in stakes.iter().filter(|(stake, existing_pool)| {
                                stake.token.eq_type(&stake_id.token)
                                    && existing_pool.is_none()
                                    && stake_id.contract_id == stake.contract_id
                            }) {
                                if let Some(unmerged) =
                                    stake.token.remove_amount(unstake_amount.to_owned())
                                {
                                    stakes.remove(&stake);
                                    stake.token = unmerged;
                                    stakes.insert(&stake, &None);
                                    unstaked = true;
                                    break;
                                }
                            }
                        }
                    }
                };

                if unstaked {
                    if let Some(staker) = reregister {
                        require!(staker != staker_id, "Cannot reregister to same account");

                        self.register_stake(stake_id, staker);
                    }
                } else {
                    panic_str("Stake cannot be unregistered");
                }
            }

            None => panic_str("Account not registered"),
        }
    }

    fn transfer_stake(&self, stake_id: StakeId, receiver_id: AccountId, amount: Option<u128>) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        stake_id.transfer(receiver_id, current_account_id().to_string(), amount);
    }

    fn assert_pool_result(&mut self, pool_id: PoolId, pool_result: Option<AccountId>) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let mut pool = self
            .staking
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic_str("given pool id does not exist"));

        require!(pool.active, "Pool is not active");

        if let Some(result) = &pool_result {
            require!(
                pool.required_stakes.0.get(result).is_some(),
                "Result not contained in pool results"
            );
        }

        pool.result = pool_result;

        self.staking.stake_pools.insert(&pool_id, &pool);
    }

    fn get_stakes(&self, staker_id: AccountId) -> Vec<(StakeId, Option<PoolId>)> {
        match self.staking.stakes.get(&staker_id) {
            Some(stakes) => {
                let mut stakes_vec = Vec::new();
                for (id, stake) in stakes.iter() {
                    stakes_vec.push((id, stake));
                }

                stakes_vec
            }

            None => panic_str("No stakes for given account id"),
        }
    }

    fn verify_stake(&self, stake_id: StakeId, check_id: Option<AccountId>) -> Promise {
        stake_id.verify(check_id.unwrap_or(env::current_account_id()))
    }

    fn get_pools(&self, owner: Option<AccountId>) -> HashMap<PoolId, Pool> {
        self.staking.internal_get_pools(&owner)
    }

    fn distribute_stakes(&mut self, pool_id: PoolId) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let mut pool = self
            .staking
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic_str("given pool id does not exist"));

        require!(pool.active, "Pool is not active");

        match pool.result {
            Some(result) => {
                let stake_receviers = pool.required_stakes.0.remove(&result).unwrap();

                for (receiver, rewards) in stake_receviers.iter() {
                    for (reward, rewarder) in rewards.iter() {
                        self.unregister_stake(
                            reward.to_owned(),
                            rewarder.to_owned(),
                            Some(receiver.to_owned()),
                        );
                    }
                }
            }

            None => panic_str("Pool result is required"),
        }
    }

    fn toggle_pool_active(&mut self, pool_id: PoolId, toggle: bool) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        let mut pool = self
            .staking
            .stake_pools
            .get(&pool_id)
            .unwrap_or_else(|| panic_str("given pool id does not exist"));

        pool.active = toggle;

        self.staking.stake_pools.insert(&pool_id, &pool);
    }

    fn remove_pool(&mut self, pool_id: PoolId) {
        require!(
            env::signer_account_id() == self.owner,
            "Restricted function"
        );

        assert!(
            self.staking
                .stake_pools
                .get(&pool_id)
                .unwrap_or_else(|| panic_str("given pool id does not exist"))
                .resolved,
            "Pool is unresolved"
        );

        self.staking.stake_pools.remove(&pool_id);
    }
}

impl StakeManagement {
    pub fn new<S, P>(stakes_prefix: S, stake_pools_prefix: P) -> Self
    where
        S: IntoStorageKey,
        P: IntoStorageKey,
    {
        let mut stakes = LookupMap::new(stakes_prefix);

        let self_id = env::current_account_id();

        stakes.insert(
            &self_id,
            &UnorderedMap::new(StorageKey::StakesPerOwner {
                account_hash: hash_account_id(&self_id),
            }),
        );

        Self {
            stake_pools: UnorderedMap::new(stake_pools_prefix),
            stakes,
        }
    }

    pub fn internal_get_pools(&self, owner: &Option<AccountId>) -> HashMap<PoolId, Pool> {
        let mut pools = HashMap::new();

        for (pool_id, pool) in self.stake_pools.iter() {
            if let Some(id) = owner {
                if &pool.owner == id {
                    pools.insert(pool_id, pool);
                }
            } else {
                pools.insert(pool_id, pool);
            }
        }

        pools
    }

    pub fn internal_register(&mut self, account_id: &AccountId) {
        if self
            .stakes
            .insert(
                account_id,
                &UnorderedMap::new(StorageKey::StakesPerOwner {
                    account_hash: hash_account_id(account_id),
                }),
            )
            .is_some()
        {
            panic_str("Account aleady registered");
        }
    }
}

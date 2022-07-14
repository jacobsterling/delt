use crate::ext_contracts::{ext_ft_contract, ext_mt_contract, ext_nft_contract};
use crate::*;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{near_bindgen, require, AccountId, Balance, Gas, Promise};

/// Type alias for convenience
pub type TokenId = String;
pub struct Pool {
    players: Vec<AccountId>,

    player_stakes: Option<Vec<(AccountId, Vec<TokenId>)>>,
}

#[derive(Deserialize, Serialize)]
pub struct Stake {
    contract_id: AccountId,

    // for nft or mt contracts, should be left as none for fungable token
    token_id: Option<TokenId>,

    //should be left as none for nft's
    balance: Option<Balance>,
}

pub type PoolId = String;

pub const BASIC_GAS: Gas = Gas(5_000_000_000_000);

const NO_DEPOSIT: Balance = 0;

pub trait Staking {
    fn deathmatch(&mut self, room_id: String, player_stakes: Vec<(AccountId, Vec<Stake>)>);

    fn end_deathmatch(&mut self, room_id: String);

    fn dungeon(&mut self, room_id: String, player_ids: Vec<AccountId>);

    fn end_dungeon(&mut self, room_id: String);
}

#[near_bindgen]
impl Staking for Contract {
    fn deathmatch(&mut self, room_id: String, player_stakes: Vec<(AccountId, Vec<Stake>)>) {
        require!(
            player_stakes.len() > 1,
            "More than 1 player required for deathmatch"
        );

        for (player_id, stakes) in player_stakes.into_iter() {
            for stake in stakes.into_iter() {
                if let Some(token_id) = stake.token_id {
                    if let Some(balance) = stake.balance {
                        ext_mt_contract::ext(stake.contract_id).mt_transfer_call(
                            env::current_account_id(),
                            token_id,
                            U128(balance),
                            None,
                            None,
                            "Delt stake".to_string(),
                        );
                    } else {
                        ext_nft_contract::ext(stake.contract_id);
                    }
                } else {
                    ext_ft_contract::ext(stake.contract_id);
                }
            }
        }
    }

    fn end_deathmatch(&mut self, pool_id: String) {}

    fn dungeon(&mut self, pool_id: String, player_ids: Vec<AccountId>) {}

    fn end_dungeon(&mut self, pool_id: String) {}
}

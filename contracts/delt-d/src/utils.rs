use crate::*;
use near_sdk::{env, require, AccountId, CryptoHash, Promise};

pub fn hash_account_id(account_id: &AccountId) -> CryptoHash {
    let mut hash = CryptoHash::default();
    hash.copy_from_slice(&env::sha256(account_id.as_bytes()));
    hash
}

pub fn refund_deposit_to_account(storage_used: u64, account_id: AccountId) {
    let required_cost = env::storage_byte_cost() * Balance::from(storage_used);
    let attached_deposit = env::attached_deposit();

    require!(
        required_cost <= attached_deposit,
        format!("Must attach {} yoctoNEAR to cover storage", required_cost)
    );

    let refund = attached_deposit - required_cost;
    if refund > 1 {
        Promise::new(account_id).transfer(refund);
        env::log_str(format!("{} yoctoNEAR refunded.", refund).as_str());
    }
}

/// Assumes that the precedecessor will be refunded
pub fn refund_deposit(storage_used: u64) {
    refund_deposit_to_account(storage_used, env::predecessor_account_id())
}

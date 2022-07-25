use near_sdk::{
    test_utils::{accounts, VMContextBuilder},
    testing_env, AccountId,
};

pub fn set_caller(context: &mut VMContextBuilder, account_id: usize) {
    testing_env!(context
        .signer_account_id(accounts(account_id))
        .predecessor_account_id(accounts(account_id))
        .build())
}

pub fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(accounts(0))
        .signer_account_id(predecessor_account_id.clone())
        .predecessor_account_id(predecessor_account_id);
    builder
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod test_delt_dungeon;

#[cfg(all(test, not(target_arch = "wasm32")))]
mod test_delt_fungable_token;

#[cfg(all(test, not(target_arch = "wasm32")))]
mod test_delt_multitoken;

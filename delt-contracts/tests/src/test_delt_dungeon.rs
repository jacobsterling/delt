use crate::get_context;
use delt_d::{
    staking::{Stake, Staking},
    Contract,
};
use near_contract_standards::{
    fungible_token::core::FungibleTokenCore, storage_management::StorageManagement,
};
use near_sdk::{env, test_utils::accounts, testing_env, AccountId, Balance};

const TOTAL_SUPPLY: Balance = 1_000_000_000_000_000;

#[test]
fn test_new() {
    let mut context = get_context(accounts(1));
    testing_env!(context.build());
    let contract = Contract::new_default_meta(accounts(1).into(), TOTAL_SUPPLY.into());
    testing_env!(context.is_view(true).build());
    assert_eq!(contract.ft_total_supply().0, TOTAL_SUPPLY);
    assert_eq!(contract.ft_balance_of(accounts(1)).0, TOTAL_SUPPLY);
}

#[test]
#[should_panic]
fn test_transfer() {
    let mut context = get_context(accounts(2));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(2).into(), TOTAL_SUPPLY.into());
    testing_env!(context
        .storage_usage(env::storage_usage())
        .attached_deposit(contract.storage_balance_bounds().min.into())
        .predecessor_account_id(accounts(1))
        .build());

    // Paying for account registration, aka storage deposit
    contract.storage_deposit(None, None);

    testing_env!(context
        .storage_usage(env::storage_usage())
        .attached_deposit(1)
        .predecessor_account_id(accounts(2))
        .build());

    let transfer_amount = 1000;

    contract.ft_transfer(accounts(1), transfer_amount.into(), None);

    testing_env!(context
        .storage_usage(env::storage_usage())
        .account_balance(env::account_balance())
        .is_view(true)
        .attached_deposit(0)
        .build());

    assert_eq!(
        contract.ft_balance_of(accounts(2)).0,
        (TOTAL_SUPPLY - transfer_amount)
    );
    assert_eq!(contract.ft_balance_of(accounts(1)).0, transfer_amount);
}

#[test]
fn test_stake_pool() {
    let mut context = get_context(accounts(2));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(2).into(), TOTAL_SUPPLY.into());
    testing_env!(context
        .storage_usage(env::storage_usage())
        .attached_deposit(contract.storage_balance_bounds().min.into())
        .predecessor_account_id(accounts(1))
        .build());
    // Paying for account registration, aka storage deposit
    contract.storage_deposit(None, None);

    testing_env!(context
        .storage_usage(env::storage_usage())
        .attached_deposit(1)
        .predecessor_account_id(accounts(2))
        .build());

    testing_env!(context
        .signer_account_id(accounts(0))
        .predecessor_account_id(accounts(0))
        .build());

    let stake1 = Stake {
        contract_id: todo!(),
        token_id: todo!(),
        balance: todo!(),
        potential_recievers: todo!(),
        staked_on_result: todo!(),
        staked: false,
    };
    let stake2 = Stake {
        contract_id: todo!(),
        token_id: todo!(),
        balance: todo!(),
        potential_recievers: todo!(),
        staked_on_result: todo!(),
        staked: false,
    };
    let stake3 = Stake {
        contract_id: todo!(),
        token_id: todo!(),
        balance: todo!(),
        potential_recievers: todo!(),
        staked_on_result: todo!(),
        staked: false,
    };
    let stake4 = Stake {
        contract_id: todo!(),
        token_id: todo!(),
        balance: todo!(),
        potential_recievers: todo!(),
        staked_on_result: todo!(),
        staked: false,
    };

    let stakes: Vec<(AccountId, Vec<Stake>)> = vec![
        (accounts(0), vec![stake1, stake2]),
        (accounts(1), vec![stake3, stake4]),
    ];

    let pool_id = "111".to_string();

    contract.create_stake_pool(
        pool_id.clone(),
        stakes,
        vec![accounts(0), accounts(1)],
        true,
    );

    let pool = contract.get_pool(pool_id.clone());
}

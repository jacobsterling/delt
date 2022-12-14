use delt_ft::Contract;
use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_contract_standards::storage_management::StorageManagement;
use near_sdk::log;
use near_sdk::test_utils::accounts;
use near_sdk::{testing_env, Balance};

use crate::{get_context, set_caller};

const TOTAL_SUPPLY: Balance = 1_000_000_000_000_000;

#[cfg(test)]
#[test]
fn test_new() {
    let mut context = get_context(accounts(1));
    testing_env!(context.build());
    let contract = Contract::new(accounts(1).into(), TOTAL_SUPPLY.into());
    testing_env!(context.is_view(true).build());
    assert_eq!(contract.ft_total_supply().0, TOTAL_SUPPLY);
    assert_eq!(contract.ft_balance_of(accounts(1)).0, TOTAL_SUPPLY);
}

#[test]
#[should_panic(expected = "The contract is not initialized")]
fn test_default() {
    let context = get_context(accounts(1));
    testing_env!(context.build());
    let _contract = Contract::default();
}

#[test]
fn test_transfer() {
    let mut context = get_context(accounts(2));

    let mut contract = Contract::new(accounts(0).into(), TOTAL_SUPPLY.into());

    let transfer_amount = TOTAL_SUPPLY / 3;

    let fee = transfer_amount * 300 / 10000;

    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.storage_deposit(Some(accounts(1)), None);
    contract.storage_deposit(Some(accounts(2)), None);

    testing_env!(context.attached_deposit(1).build());

    contract.ft_transfer(accounts(1), transfer_amount.into(), None);

    log!(contract.ft_balance_of(accounts(1)).0.to_string());

    set_caller(&mut context, 1);

    testing_env!(context.attached_deposit(1).build());

    contract.ft_transfer(accounts(2), transfer_amount.into(), None);

    //received developer fee
    assert_eq!(
        contract.ft_balance_of(accounts(0)).0,
        (TOTAL_SUPPLY - transfer_amount + fee * 20 / 100)
    );

    //transferred everything
    assert_eq!(contract.ft_balance_of(accounts(1)).0, 0);

    //received transfer amount - fee
    assert_eq!(
        contract.ft_balance_of(accounts(2)).0,
        (transfer_amount - fee)
    );
}

//administration purposes
#[test]
fn test_transfer_on_behalf_of() {
    let mut context = get_context(accounts(2));

    let mut contract = Contract::new(accounts(0).into(), TOTAL_SUPPLY.into());

    let transfer_amount = TOTAL_SUPPLY / 3;

    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.storage_deposit(Some(accounts(1)), None);
    contract.storage_deposit(Some(accounts(2)), None);

    testing_env!(context.attached_deposit(1).build());

    contract.ft_transfer(accounts(1), transfer_amount.into(), None);

    testing_env!(context.attached_deposit(1).build());

    contract.ft_transfer(
        accounts(2),
        transfer_amount.into(),
        Some(accounts(1).to_string()),
    );

    //received developer fee
    assert_eq!(
        contract.ft_balance_of(accounts(0)).0,
        (TOTAL_SUPPLY - transfer_amount)
    );

    //transferred everything
    assert_eq!(contract.ft_balance_of(accounts(1)).0, 0);

    //received transfer amount - fee
    assert_eq!(contract.ft_balance_of(accounts(2)).0, (transfer_amount));
}

use crate::{get_context, init_tokens, set_caller};
use delt_d::{
    staking::{Stake, Staking},
    Contract,
};
use delt_mt::{
    multi_token::{core::MultiTokenCore, token::Token},
    MTContract, MTContractExt,
};
use near_contract_standards::{
    fungible_token::core::FungibleTokenCore, storage_management::StorageManagement,
};
use near_sdk::{
    env::{self, log_str},
    json_types::U128,
    log,
    serde::Serialize,
    test_utils::{accounts, VMContextBuilder},
    testing_env, AccountId, Balance, Gas, Promise,
};

const TOTAL_SUPPLY: Balance = 10;
const GAS_FOR_RESOLVE_TRANSFER: Gas = Gas(5_000_000_000_000);
const GAS_FOR_TRANSFER_CALL: Gas = Gas(25_000_000_000_000 + GAS_FOR_RESOLVE_TRANSFER.0);

fn get_stakes(token_id: String, token_id_2: String) -> Vec<(AccountId, Vec<Stake>)> {
    //account 3 is winner
    let stake1 = Stake {
        contract_id: accounts(1),
        token_id: Some(token_id.clone()),
        balance: Some(1),
        potential_recievers: vec![(accounts(4), accounts(4))],
        staked_on_result: accounts(3),
        staked: false,
    };
    let stake2 = Stake {
        contract_id: accounts(2),
        token_id: None,
        balance: Some(500),
        potential_recievers: vec![(accounts(4), accounts(4))],
        staked_on_result: accounts(3),
        staked: false,
    };
    let stake3 = Stake {
        contract_id: accounts(1),
        token_id: Some(token_id_2.clone()),
        balance: 1.into(),
        potential_recievers: vec![(accounts(3), accounts(3))],
        staked_on_result: accounts(4),
        staked: false,
    };
    let stake4 = Stake {
        contract_id: accounts(2),
        token_id: None,
        balance: Some(1000),
        potential_recievers: vec![(accounts(3), accounts(3))],
        staked_on_result: accounts(4),
        staked: false,
    };

    let stake5 = Stake {
        contract_id: accounts(1),
        token_id: None,
        balance: Some(3000),
        potential_recievers: vec![(accounts(3), accounts(3))],
        staked_on_result: accounts(4),
        staked: false,
    };
    let stake6 = Stake {
        contract_id: accounts(1),
        token_id: None,
        balance: Some(2000),
        potential_recievers: vec![(accounts(3), accounts(3))],
        staked_on_result: accounts(4),
        staked: false,
    };

    let stakes: Vec<(AccountId, Vec<Stake>)> = vec![
        (accounts(3), vec![stake1, stake2]),
        (accounts(4), vec![stake3, stake4]),
        (accounts(5), vec![stake5, stake6]),
    ];
    stakes
}

#[test]
fn test_new() {
    let mut context = VMContextBuilder::new();

    let contract = Contract::new_default_meta(accounts(0).into(), TOTAL_SUPPLY.into());

    testing_env!(context.is_view(true).build());
    assert_eq!(contract.ft_total_supply().0, TOTAL_SUPPLY);
    assert_eq!(contract.ft_balance_of(accounts(1)).0, TOTAL_SUPPLY);
}

#[test]
#[should_panic(expected = "Unapproved transfer")]
fn test_transfer() {
    let mut context = VMContextBuilder::new();

    set_caller(&mut context, 0);

    let mut contract = Contract::new_default_meta(accounts(0).into(), TOTAL_SUPPLY.into());

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.storage_deposit(Some(accounts(1)), None);
    contract.storage_deposit(Some(accounts(2)), None);

    let transfer_amount = 5;

    testing_env!(context.attached_deposit(1).build());
    contract.ft_transfer(accounts(1), transfer_amount.into(), None);

    assert_eq!(
        contract.ft_balance_of(accounts(0)).0,
        (TOTAL_SUPPLY - transfer_amount)
    );

    assert_eq!(contract.ft_balance_of(accounts(1)).0, transfer_amount);

    set_caller(&mut context, 1);

    testing_env!(context.attached_deposit(1).build());

    contract.ft_transfer(accounts(2), transfer_amount.into(), None);
}

#[tokio::test]
async fn test_stake_pool() {
    //same test needs to be done on test net (cant get promises to work)

    let mut context = VMContextBuilder::new();

    testing_env!(context
        .current_account_id(accounts(0))
        .attached_deposit(10u128.pow(24))
        .build());

    let mut stake_contract = Contract::new_default_meta(accounts(0).into(), 0.into());

    let mut mt_contract = MTContract::new_default_meta(accounts(0).into());

    let mut ft_contract =
        delt_ft::Contract::new_default_meta(accounts(0).into(), 1_000_000_000_000_000.into());

    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    let (token, token_2, _) = init_tokens(&mut mt_contract);

    mt_contract.register(token.token_id.clone(), accounts(3));
    mt_contract.register(token.token_id.clone(), accounts(4));
    mt_contract.register(token_2.token_id.clone(), accounts(3));
    mt_contract.register(token_2.token_id.clone(), accounts(4));

    ft_contract.storage_deposit(Some(accounts(3)), None);
    ft_contract.storage_deposit(Some(accounts(4)), None);
    ft_contract.storage_deposit(Some(accounts(5)), None);

    testing_env!(context.attached_deposit(1).build());

    mt_contract.mt_transfer(
        accounts(3),
        token.token_id.clone(),
        1.into(),
        None,
        Some("Gift".to_string()),
    );
    mt_contract.mt_transfer(
        accounts(4),
        token_2.token_id.clone(),
        1.into(),
        None,
        Some("Gift".to_string()),
    );

    //adding more for fee

    ft_contract.ft_transfer(accounts(3), (1000 + 1000 * 300 / 10000).into(), None);
    ft_contract.ft_transfer(accounts(4), (2000 + 2000 * 300 / 10000).into(), None);
    ft_contract.ft_transfer(accounts(5), (5000 + 5000 * 300 / 10000).into(), None);

    let pool_id = "111".to_string();

    set_caller(&mut context, 4);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    stake_contract.create_stake_pool(
        pool_id.clone(),
        get_stakes(token.token_id.clone(), token_2.token_id.clone()),
        vec![accounts(3), accounts(4)],
        true,
    );

    testing_env!(context
        .attached_deposit(1)
        .prepaid_gas(GAS_FOR_TRANSFER_CALL + GAS_FOR_RESOLVE_TRANSFER)
        .build());

    ft_contract.ft_transfer_call(accounts(0), 1000.into(), None, pool_id.clone());

    testing_env!(context
        .attached_deposit(1)
        .prepaid_gas(GAS_FOR_TRANSFER_CALL + GAS_FOR_RESOLVE_TRANSFER)
        .build());

    mt_contract.mt_transfer_call(
        accounts(0),
        token_2.token_id.clone(),
        1.into(),
        None,
        None,
        pool_id.clone(),
    );

    set_caller(&mut context, 3);

    testing_env!(context
        .attached_deposit(1)
        .prepaid_gas(GAS_FOR_TRANSFER_CALL + GAS_FOR_RESOLVE_TRANSFER)
        .build());

    ft_contract.ft_transfer_call(accounts(0), 1000.into(), None, pool_id.clone());

    testing_env!(context
        .attached_deposit(1)
        .prepaid_gas(GAS_FOR_TRANSFER_CALL + GAS_FOR_RESOLVE_TRANSFER)
        .build());

    mt_contract.mt_transfer_call(
        accounts(0),
        token.token_id.clone(),
        1.into(),
        None,
        None,
        pool_id.clone(),
    );

    set_caller(&mut context, 5);

    testing_env!(context
        .attached_deposit(1)
        .prepaid_gas(GAS_FOR_TRANSFER_CALL + GAS_FOR_RESOLVE_TRANSFER)
        .build());

    ft_contract.ft_transfer_call(accounts(0), 5000.into(), None, pool_id.clone());

    set_caller(&mut context, 0);

    //println!("{:?}", stake_contract.get_pool(pool_id.clone()));

    for (player, stakes) in get_stakes(token.token_id.clone(), token_2.token_id.clone()).into_iter()
    {
        for (i, _stake) in stakes.iter().enumerate() {
            stake_contract.assert_stake(pool_id.clone(), player.clone(), i, true)
        }
    }

    //println!("{:?}", stake_contract.get_pool(pool_id.clone()));

    assert!(stake_contract.validate_stakes(pool_id.clone()));

    stake_contract.toggle_pool(pool_id.clone(), true);

    stake_contract.resolve_stake_pool(pool_id.clone(), Some(accounts(3)))
}

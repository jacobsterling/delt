use crate::multi_token::metadata::MultiTokenMetadataProvider;
use crate::*;
use env::log_str;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;
use serde_json::{json, to_string, Map, Value};

fn create_token_md(title: String, description: String) -> TokenMetadata {
    TokenMetadata {
        title: Some(title),
        description: Some(description),
        media: None,
        media_hash: None,
        issued_at: Some(String::from("123456")),
        expires_at: None,
        starts_at: None,
        updated_at: None,
        extra: Some(String::from(
            "{
            \"defence\": {
                \"reflect\": {
                  \"tier\": 0,
                  \"trait\": \"rubber\",
                  \"value\": 1
                }
              },
            \"abilitys\": {
                \"pistol\": {
                  \"tier\": 0,
                  \"trait\": \"rubber\",
                  \"value\": 1
                },
                \"bazooka\": {
                  \"tier\": 0,
                  \"trait\": \"rubber\",
                  \"value\": 1
                },
                \"whip\": {
                  \"tier\": 0,
                  \"trait\": \"rubber\",
                  \"value\": 1
                },
                \"battle axe\": {
                  \"tier\": 0,
                  \"trait\": \"rubber\",
                  \"value\": 1
                }
            }
          }",
        )),
        reference: None,
        reference_hash: None,
    }
}

fn create_token_md_2(title: String, description: String) -> TokenMetadata {
    TokenMetadata {
        title: Some(title),
        description: Some(description),
        media: None,
        media_hash: None,
        issued_at: Some(String::from("123456")),
        expires_at: None,
        starts_at: None,
        updated_at: None,
        extra: Some(String::from(
            "{
            \"abilitys\": {
                \"whip\": {
                  \"tier\": 1,
                  \"trait\": \"rubber, fire\",
                  \"value\": 1
                }
            },
          \"defence\": {
            \"resistance\": {
              \"tier\": 0,
              \"trait\": \"fire\",
              \"value\": 1
            }
          }
        }",
        )),
        reference: None,
        reference_hash: None,
    }
}

fn create_token_md_3(title: String, description: String) -> TokenMetadata {
    TokenMetadata {
        title: Some(title),
        description: Some(description),
        media: None,
        media_hash: None,
        issued_at: Some(String::from("123456")),
        expires_at: None,
        starts_at: None,
        updated_at: None,
        extra: Some(String::from(
            "{
            \"leadership\": {
                \"king\": {
                  \"tier\": 999,
                  \"trait\": \"one piece\",
                  \"value\": 999
                }
          }
        }",
        )),
        reference: None,
        reference_hash: None,
    }
}

fn init_tokens(contract: &mut MTContract) -> (Token, Token, Token) {
    let token = create_token_md("luffy".into(), "king of pirates".into());
    let token_2 = create_token_md_2("fire devil fruit".into(), "adds fire damage".into());
    let token_3 = create_token_md_3(
        "one piece".into(),
        "greatest treasure in the grand line".into(),
    );

    let token = contract.mt_mint(accounts(0), token.clone(), 2);
    let token_2 = contract.mt_mint(accounts(0), token_2.clone(), 2);
    let token_3 = contract.mt_mint(accounts(0), token_3.clone(), 2);

    (token, token_2, token_3)
}

fn set_caller(context: &mut VMContextBuilder, account_id: usize) {
    testing_env!(context
        .signer_account_id(accounts(account_id))
        .predecessor_account_id(accounts(account_id))
        .build())
}
#[test]
fn get_contract_metadata() {
    let mut context = VMContextBuilder::new();
    set_caller(&mut context, 0);
    let contract = MTContract::new_default_meta(accounts(0));
    contract.mt_metadata();
}

#[test]
fn test_set_token_stats() {
    let mut context = VMContextBuilder::new();

    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build()); // deposit of 1 near
    let mut contract = MTContract::new_default_meta(accounts(0));

    let (token, token_2, token_3) = init_tokens(&mut contract);

    let attrs = contract.mt_attrs(&token.token_id).unwrap().attrs;

    let new_attrs = MTContract::merge_attrs(
        attrs,
        json!(
            {
                "defence": {
                    "malleable": Stat {
                        tier: 0,
                        quality: "rubber".to_string(),
                        value: 1
                    }
                }
            }
        )
        .as_object()
        .unwrap()
        .clone(),
    );

    contract.set_attributes(token.token_id.clone(), new_attrs);

    let attributes = contract.read_attributes(&token.token_id);

    log_str(&attributes);
}

#[test]
fn test_mint_existing() {
    let mut context = VMContextBuilder::new();

    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build()); // deposit of 1 near

    log_str(&env::attached_deposit().to_string());
    let mut contract = MTContract::new_default_meta(accounts(0));

    let (token, token_2, token_3) = init_tokens(&mut contract);

    let init_supply = contract.mt_supply(token.token_id.clone()).unwrap();

    contract.mt_mint(accounts(0), token.metadata.unwrap().clone(), 1);

    let supply = contract.mt_supply(token.token_id.clone()).unwrap();

    assert_eq!(init_supply.0 + 1, supply.0)
}

#[test]
fn test_burn() {
    let mut context = VMContextBuilder::new();

    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build()); // deposit of 1 near

    let mut contract = MTContract::new_default_meta(accounts(0));

    let (token, token_2, token_3) = init_tokens(&mut contract);

    let init_supply = contract.mt_supply(token.token_id.clone()).unwrap();

    contract.mt_burn(
        accounts(0),
        token.token_id.clone(),
        1,
        Some("test burn".to_string()),
    );

    let supply = contract.mt_supply(token.token_id.clone()).unwrap();

    assert_eq!(init_supply.0 - 1, supply.0);
}

#[test]
fn test_merge() {
    let mut context = VMContextBuilder::new();

    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build()); // deposit of 1 near

    let mut contract = MTContract::new_default_meta(accounts(0));

    let (token, token_2, token_3) = init_tokens(&mut contract);

    let init_supply = contract.mt_supply(token.token_id.clone()).unwrap();
    let init_supply_2 = contract.mt_supply(token_2.token_id.clone()).unwrap();
    let init_supply_3 = contract.mt_supply(token_3.token_id.clone()).unwrap();

    let tokens: Vec<TokenId> = vec![
        token.token_id.clone(),
        token_2.token_id.clone(),
        token_3.token_id.clone(),
    ];

    let new_metadata = create_token_md_3(
        "luffy the pirate king".to_string(),
        "after the one piece".to_string(),
    );

    let new = contract.mt_merge(accounts(0), tokens, None, Some(new_metadata));

    log_str(&new.metadata.unwrap().extra.unwrap());

    let supply = contract.mt_supply(token.token_id.clone()).unwrap();
    let supply_2 = contract.mt_supply(token_2.token_id.clone()).unwrap();
    let supply_3 = contract.mt_supply(token_3.token_id.clone()).unwrap();

    assert_eq!(init_supply.0 - 1, supply.0);
    assert_eq!(init_supply_2.0 - 1, supply_2.0);
    assert_eq!(init_supply_3.0 - 1, supply_3.0);
    assert_eq!(new.supply, 1);
}

#[test]
fn test_transfer() {
    let mut context = VMContextBuilder::new();
    set_caller(&mut context, 0);
    let mut contract = MTContract::new_default_meta(accounts(0));
    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    let (token, _, _) = init_tokens(&mut contract);

    contract.register(token.token_id.clone(), accounts(1));
    contract.register(token.token_id.clone(), accounts(2));

    contract.mt_approve(vec![token.token_id.clone()], vec![2], accounts(2), None);

    set_caller(&mut context, 2);

    // Transfer some tokens
    testing_env!(context.attached_deposit(1).build());

    contract.mt_transfer(
        accounts(1),
        token.token_id.clone(),
        2.into(),
        Some((accounts(0), 0)),
        None,
    );

    assert_eq!(
        contract
            .mt_balance_of(accounts(1), token.token_id.clone())
            .0,
        2,
        "Wrong balance"
    );

    // Transfer some of the tokens back to original owner.
    set_caller(&mut context, 1);
    testing_env!(context.attached_deposit(1).build());
    contract.mt_transfer(accounts(0), token.token_id.clone(), 1.into(), None, None);

    assert_eq!(
        contract
            .mt_balance_of(accounts(1), token.token_id.clone())
            .0,
        1,
        "Wrong balance"
    );
}

#[test]
#[should_panic(expected = "Transferred amounts must be greater than 0")]
fn test_transfer_amount_must_be_positive() {
    let mut context = VMContextBuilder::new();
    set_caller(&mut context, 0);

    let mut contract = MTContract::new_default_meta(accounts(0));
    testing_env!(context.attached_deposit(1).build());
    let (token, _, _) = init_tokens(&mut contract);
    contract.register(token.token_id.clone(), accounts(1));

    contract.mt_transfer(accounts(1), token.token_id.clone(), U128(0), None, None)
}

#[test]
#[should_panic(expected = "The account doesn't have enough balance")]
fn test_sender_account_must_have_sufficient_balance() {
    let mut context = VMContextBuilder::new();
    set_caller(&mut context, 0);
    let mut contract = MTContract::new_default_meta(accounts(0));
    let (token, _, _) = init_tokens(&mut contract);
    contract.register(token.token_id.clone(), accounts(1));
    testing_env!(context.attached_deposit(1).build());

    // account(0) has only 2000 of token.
    contract.mt_transfer(accounts(1), token.token_id.clone(), U128(3000), None, None)
}

#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn test_transfers_require_one_yocto() {
    let mut context = VMContextBuilder::new();
    set_caller(&mut context, 0);
    let mut contract = MTContract::new_default_meta(accounts(0));
    let (token, _, _) = init_tokens(&mut contract);
    contract.register(token.token_id.clone(), accounts(1));
    contract.mt_transfer(accounts(1), token.token_id.clone(), U128(1000), None, None)
}

#[test]
#[should_panic(expected = "The account charlie is not registered")]
fn test_receiver_must_be_registered() {
    let mut context = VMContextBuilder::new();
    set_caller(&mut context, 0);
    let mut contract = MTContract::new_default_meta(accounts(0));
    let (token, _, _) = init_tokens(&mut contract);
    contract.register(token.token_id.clone(), accounts(1));
    testing_env!(context.attached_deposit(1).build());

    contract.mt_transfer(accounts(2), token.token_id.clone(), U128(100), None, None)
}

#[test]
#[should_panic(expected = "Sender and receiver must differ")]
fn test_cannot_transfer_to_self() {
    let mut context = VMContextBuilder::new();
    set_caller(&mut context, 0);
    let mut contract = MTContract::new_default_meta(accounts(0));
    let (token, _, _) = init_tokens(&mut contract);
    contract.register(token.token_id.clone(), accounts(1));
    testing_env!(context.attached_deposit(1).build());

    contract.mt_transfer(accounts(0), token.token_id.clone(), U128(100), None, None)
}

#[test]
fn test_batch_transfer() {
    let mut context = VMContextBuilder::new();
    let mut contract = MTContract::new_default_meta(accounts(0));
    set_caller(&mut context, 0);

    let (quote_token, base_token, _) = init_tokens(&mut contract);

    contract.register(quote_token.token_id.clone(), accounts(1));
    contract.register(base_token.token_id.clone(), accounts(1));

    testing_env!(context.attached_deposit(1).build());

    // Perform the transfers
    contract.mt_batch_transfer(
        accounts(1),
        vec![quote_token.token_id.clone(), base_token.token_id.clone()],
        vec![U128(4), U128(600)],
        None,
        None,
    );

    assert_eq!(
        contract
            .mt_balance_of(accounts(0), quote_token.token_id.clone())
            .0,
        996,
        "Wrong balance"
    );
    assert_eq!(
        contract
            .mt_balance_of(accounts(1), quote_token.token_id.clone())
            .0,
        4,
        "Wrong balance"
    );

    assert_eq!(
        contract
            .mt_balance_of(accounts(0), base_token.token_id.clone())
            .0,
        1400,
        "Wrong balance"
    );
    assert_eq!(
        contract
            .mt_balance_of(accounts(1), base_token.token_id.clone())
            .0,
        600,
        "Wrong balance"
    );
}

#[test]
#[should_panic(expected = "The account doesn't have enough balance")]
fn test_batch_transfer_all_balances_must_be_sufficient() {
    let mut context = VMContextBuilder::new();
    let mut contract = MTContract::new_default_meta(accounts(0));
    set_caller(&mut context, 0);

    let (quote_token, base_token, _) = init_tokens(&mut contract);

    contract.register(quote_token.token_id.clone(), accounts(1));
    contract.register(base_token.token_id.clone(), accounts(1));
    testing_env!(context.attached_deposit(1).build());

    contract.mt_batch_transfer(
        accounts(1),
        vec![quote_token.token_id.clone(), base_token.token_id.clone()],
        vec![U128(4), U128(6000)],
        None,
        None,
    );
}

#[test]
fn test_purchace() {
    let mut context = VMContextBuilder::new();
    let mut contract = MTContract::new_default_meta(accounts(0));
    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    let (token, token_2, _) = init_tokens(&mut contract);

    let init_supply_0 = contract
        .mt_balance_of(accounts(0), token.token_id.clone())
        .0;
    // let init_supply_1 = contract
    //     .mt_balance_of(accounts(1), token.token_id.clone())
    //     .0;

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.create_listing(
        token.token_id.clone(),
        U128(10000),
        2,
        false,
        None,
        Some("mokey d luffy bounty".to_string()),
    );

    set_caller(&mut context, 1);

    let listings = to_string(&contract.get_listings(token.token_id.clone())).unwrap();

    log_str(&listings);

    contract.register(token.token_id.clone(), accounts(1));

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.purchase(accounts(0), token.token_id.clone());

    assert!(
        contract
            .mt_balance_of(accounts(0), token.token_id.clone())
            .0
            == init_supply_0 - 2
    );
    assert!(
        contract
            .mt_balance_of(accounts(1), token.token_id.clone())
            .0
            == 2
    );
}

#[test]
fn test_purchace_w_approval() {
    let mut context = VMContextBuilder::new();
    let mut contract = MTContract::new_default_meta(accounts(0));
    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    let (token, token_2, _) = init_tokens(&mut contract);

    contract.mt_approve(vec![token.token_id.clone()], vec![2], accounts(1), None);

    set_caller(&mut context, 1);

    let init_supply_0 = contract
        .mt_balance_of(accounts(0), token.token_id.clone())
        .0;

    contract.register(token.token_id.clone(), accounts(1));

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.create_listing(
        token.token_id.clone(),
        U128(10000),
        2,
        false,
        Some((accounts(0), 0)),
        Some("mokey d luffy bounty".to_string()),
    );

    set_caller(&mut context, 2);

    let listings = to_string(&contract.get_listings(token.token_id.clone())).unwrap();

    log_str(&listings);

    contract.register(token.token_id.clone(), accounts(2));

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.purchase(accounts(0), token.token_id.clone());

    assert!(
        contract
            .mt_balance_of(accounts(0), token.token_id.clone())
            .0
            == init_supply_0 - 2
    );
    assert!(
        contract
            .mt_balance_of(accounts(2), token.token_id.clone())
            .0
            == 2
    );
}

#[test]
fn test_auction() {
    let mut context = VMContextBuilder::new();

    let mut contract = MTContract::new_default_meta(accounts(0));
    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    let (token, token_2, _) = init_tokens(&mut contract);

    let init_supply_0 = contract
        .mt_balance_of(accounts(0), token.token_id.clone())
        .0;

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.create_listing(
        token.token_id.clone(),
        U128(10000),
        2,
        true,
        None,
        Some("mokey d luffy bounty".to_string()),
    );

    set_caller(&mut context, 1);

    let listings = to_string(&contract.get_listings(token.token_id.clone())).unwrap();

    log_str(&listings);

    contract.register(token.token_id.clone(), accounts(1));

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.bid(accounts(0), token.token_id.clone());

    set_caller(&mut context, 2);

    let listings = to_string(&contract.get_listings(token.token_id.clone())).unwrap();

    log_str(&listings);

    contract.register(token.token_id.clone(), accounts(2));

    testing_env!(context.attached_deposit(10u128.pow(25)).build());

    contract.bid(accounts(0), token.token_id.clone());

    context.epoch_height(2);

    set_caller(&mut context, 0);

    contract.end_auction(accounts(0), token.token_id.clone());

    assert!(
        contract
            .mt_balance_of(accounts(0), token.token_id.clone())
            .0
            == init_supply_0 - 2
    );

    assert!(
        contract
            .mt_balance_of(accounts(1), token.token_id.clone())
            .0
            == 0
    );

    assert!(
        contract
            .mt_balance_of(accounts(2), token.token_id.clone())
            .0
            == 2
    );
}

#[test]
fn test_auction_w_approval() {
    let mut context = VMContextBuilder::new();

    let mut contract = MTContract::new_default_meta(accounts(0));
    set_caller(&mut context, 0);

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    let (token, token_2, _) = init_tokens(&mut contract);

    let init_supply_0 = contract
        .mt_balance_of(accounts(0), token.token_id.clone())
        .0;

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.create_listing(
        token.token_id.clone(),
        U128(10000),
        2,
        true,
        Some((accounts(0), 0)),
        Some("mokey d luffy bounty".to_string()),
    );

    set_caller(&mut context, 1);

    let listings = to_string(&contract.get_listings(token.token_id.clone())).unwrap();

    log_str(&listings);

    contract.register(token.token_id.clone(), accounts(1));

    testing_env!(context.attached_deposit(10u128.pow(24)).build());

    contract.bid(accounts(0), token.token_id.clone());

    set_caller(&mut context, 2);

    let listings = to_string(&contract.get_listings(token.token_id.clone())).unwrap();

    log_str(&listings);

    contract.register(token.token_id.clone(), accounts(2));

    testing_env!(context.attached_deposit(10u128.pow(25)).build());

    contract.bid(accounts(0), token.token_id.clone());

    context.epoch_height(2);

    set_caller(&mut context, 0);

    contract.end_auction(accounts(0), token.token_id.clone());

    assert!(
        contract
            .mt_balance_of(accounts(0), token.token_id.clone())
            .0
            == init_supply_0 - 2
    );

    assert!(
        contract
            .mt_balance_of(accounts(1), token.token_id.clone())
            .0
            == 0
    );

    assert!(
        contract
            .mt_balance_of(accounts(2), token.token_id.clone())
            .0
            == 2
    );
}

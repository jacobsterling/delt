use delt_mt::{
    multi_token::{metadata::TokenMetadata, token::Token},
    MTContract,
};
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

pub fn init_tokens(contract: &mut MTContract) -> (Token, Token, Token) {
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

#[cfg(all(test, not(target_arch = "wasm32")))]
mod test_delt_d;
#[cfg(all(test, not(target_arch = "wasm32")))]
mod test_delt_ft;
#[cfg(all(test, not(target_arch = "wasm32")))]
mod test_delt_mt;

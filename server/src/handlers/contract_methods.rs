use actix::clock::sleep;
use delt_d::{
    character::Character,
    staking::{Pool, PoolId, StakeId},
};
use near_crypto::{InMemorySigner, PublicKey};
use near_jsonrpc_client::{
    methods::{self, query::RpcQueryRequest, tx::RpcTransactionError},
    JsonRpcClient, NEAR_TESTNET_RPC_URL,
};
use near_jsonrpc_primitives::types::query::QueryResponseKind;
use near_primitives::{
    hash::CryptoHash,
    transaction::SignedTransaction,
    types::{AccountId, Balance, BlockReference, Finality, FunctionArgs},
    views::{CallResult, FinalExecutionOutcomeView, FinalExecutionStatus, QueryRequest},
};
use serde::Deserialize;
use serde_json::{from_slice, to_string, Value};
use std::{
    collections::{HashMap, HashSet},
    path::Path,
    str::FromStr,
    time::{Duration, Instant},
};

use crate::{handlers::messages::ServerError, types::Content};

lazy_static::lazy_static! {
    pub static ref RPC: JsonRpcClient = JsonRpcClient::connect(NEAR_TESTNET_RPC_URL);

    static ref ADMIN: InMemorySigner = InMemorySigner::from_file(Path::new("C:/Users/j10st/.near-credentials/testnet/delt.testnet.json")).expect("error while parsing admin signer");

    static ref DELTD: AccountId = AccountId::from_str("delt-d.delt.testnet").unwrap();

    static ref DELTFT: AccountId = AccountId::from_str("delt-ft.delt.testnet").unwrap();

    static ref DELTMT: AccountId = AccountId::from_str("delt-mt.delt.testnet").unwrap();
}

pub type Success = Vec<u8>;

pub async fn get_pools(owner: Option<AccountId>) -> Result<HashMap<PoolId, Pool>, ServerError> {
    let mut args = Content::new();

    if let Some(id) = owner {
        args.insert("owner", id.as_str());
    }

    match RPC
        .call(RpcQueryRequest {
            block_reference: BlockReference::Finality(Finality::Final),
            request: QueryRequest::CallFunction {
                account_id: DELTD.to_owned(),
                method_name: "get_pools".to_string(),
                args: FunctionArgs::from(args.into_bytes()),
            },
        })
        .await
    {
        Ok(response) => parse_query::<HashMap<PoolId, Pool>>(&response.kind),

        Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
    }
}

pub async fn create_pool(
    pool_id: &PoolId,
    pool_results: &HashSet<AccountId>,
    required_xp: &u128,
) -> Result<Pool, ServerError> {
    let mut args = Content::new();

    args.insert("pool_id", pool_id);
    args.insert("pool_results", pool_results);
    args.insert("required_xp", required_xp);

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            match poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "create_pool".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
            {
                Ok(bytes) => from_slice::<Pool>(&bytes).map_err(|e| ServerError::Serde(e)),
                Err(e) => Err(e),
            }
        }

        Err(e) => Err(e),
    }
}

pub async fn register_stake(
    stake_id: StakeId,
    staker_id: AccountId,
) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("stake_id", &stake_id.to_string());
    args.insert("staker_id", staker_id.as_str());

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "register_stake".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn unregister_stake(
    stake_id: StakeId,
    staker_id: AccountId,
    reregister: Option<AccountId>,
) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("stake_id", &stake_id.to_string());
    args.insert("staker_id", staker_id.as_str());

    if let Some(id) = reregister {
        args.insert("reregister", id.as_str());
    }

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "unregister_stake".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn transfer_stake(
    stake_id: StakeId,
    receiver_id: AccountId,
    amount: Option<u128>,
) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("stake_id", &stake_id.to_string());
    args.insert("receiver_id", receiver_id.as_str());

    if let Some(x) = amount {
        args.insert("amount", &x.to_string());
    }

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "unregister_stake".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn get_stakes(
    staker_id: AccountId,
) -> Result<Vec<(StakeId, Option<PoolId>)>, ServerError> {
    let mut args = Content::new();

    args.insert("staker_id", staker_id.as_str());

    match RPC
        .call(RpcQueryRequest {
            block_reference: BlockReference::Finality(Finality::Final),
            request: QueryRequest::CallFunction {
                account_id: DELTD.to_owned(),
                method_name: "get_stakes".to_string(),
                args: FunctionArgs::from(args.into_bytes()),
            },
        })
        .await
    {
        Ok(response) => parse_query::<Vec<(StakeId, Option<PoolId>)>>(&response.kind),

        Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
    }
}

pub async fn verify_stake(
    stake_id: StakeId,
    check_id: Option<AccountId>,
) -> Result<String, ServerError> {
    let mut args = Content::new();

    args.insert("stake_id", &stake_id.to_string());

    if let Some(id) = check_id {
        args.insert("check_id", id.as_str());
    }

    match RPC
        .call(RpcQueryRequest {
            block_reference: BlockReference::Finality(Finality::Final),
            request: QueryRequest::CallFunction {
                account_id: DELTD.to_owned(),
                method_name: "get_stakes".to_string(),
                args: FunctionArgs::from(args.into_bytes()),
            },
        })
        .await
    {
        Ok(response) => parse_query::<String>(&response.kind),

        Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
    }
}

pub async fn toggle_pool_active(pool_id: PoolId, toggle: bool) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("pool_id", &pool_id);
    args.insert("toggle", &toggle.to_string());

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "toggle_pool_active".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn assert_pool_result(
    pool_id: PoolId,
    pool_result: Option<AccountId>,
) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("pool_id", &pool_id);

    if let Some(result) = pool_result {
        args.insert("pool_result", result.as_str());
    }

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "assert_pool_result".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn distribute_stakes(pool_id: PoolId) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("pool_id", &pool_id);

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "distribute_stakes".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn get_character(account_id: &AccountId) -> Result<Character, ServerError> {
    let mut args = Content::new();

    args.insert("account_id", &account_id.to_string());

    match RPC
        .call(RpcQueryRequest {
            block_reference: BlockReference::Finality(Finality::Final),
            request: QueryRequest::CallFunction {
                account_id: DELTD.to_owned(),
                method_name: "get_character".to_string(),
                args: FunctionArgs::from(args.into_bytes()),
            },
        })
        .await
    {
        Ok(response) => parse_query::<Character>(&response.kind),

        Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
    }
}

pub async fn get_ft_balance(account_id: &AccountId) -> Result<Balance, ServerError> {
    let mut args = Content::new();

    args.insert("account_id", &account_id.to_string());

    match RPC
        .call(methods::query::RpcQueryRequest {
            block_reference: BlockReference::Finality(Finality::Final),
            request: QueryRequest::CallFunction {
                account_id: DELTFT.to_owned(),
                method_name: "ft_balance".to_string(),
                args: FunctionArgs::from(args.into_bytes()),
            },
        })
        .await
    {
        Ok(response) => parse_query::<Balance>(&response.kind),

        Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
    }
}

pub async fn set_default_attributes(attributes: &Value) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("attributes", &to_string(attributes).unwrap());

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "set_default_attributes".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn give_xp(account_id: &AccountId, xp: &u128) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("account_id", account_id);
    args.insert("amount", xp);

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "ft_mint".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

pub async fn kill_character(account_id: &AccountId) -> Result<Success, ServerError> {
    let mut args = Content::new();

    args.insert("account_id", &account_id);

    match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
        Ok((hash, current_nonce)) => {
            poll_transaction(&methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                signed_transaction: SignedTransaction::call(
                    current_nonce + 1,
                    ADMIN.account_id.to_owned(),
                    DELTD.to_owned(),
                    &*ADMIN,
                    10u128.pow(24),
                    "death".to_string(),
                    args.into_bytes(),
                    5_000_000_000_000,
                    hash,
                ),
            })
            .await
        }

        Err(e) => Err(e),
    }
}

fn parse_query<'a, T>(kind: &'a QueryResponseKind) -> Result<T, ServerError>
where
    T: ?Sized + Deserialize<'a> + Clone,
{
    match &kind {
        QueryResponseKind::CallResult(CallResult { result, logs }) => {
            match from_slice::<'a, T>(result) {
                Ok(res) => {
                    for log in logs {
                        println!("[RPC] Contract Log: {}", log)
                    }
                    Ok(res.to_owned())
                }

                Err(e) => return Err(ServerError::Serde(e)),
            }
        }

        _ => Err(ServerError::new(
            std::io::ErrorKind::InvalidData,
            "Unexpected NEAR rpc response received",
        )),
    }
}

// https://github.com/near/near-jsonrpc-client-rs/blob/master/examples/create_account.rs
async fn get_current_nonce(
    account_id: &AccountId,
    public_key: &PublicKey,
) -> Result<(CryptoHash, u64), ServerError> {
    match RPC
        .call(methods::query::RpcQueryRequest {
            block_reference: BlockReference::latest(),
            request: near_primitives::views::QueryRequest::ViewAccessKey {
                account_id: account_id.clone(),
                public_key: public_key.clone(),
            },
        })
        .await
    {
        Ok(access_key_query_response) => match access_key_query_response.kind {
            QueryResponseKind::AccessKey(access_key) => {
                Ok((access_key_query_response.block_hash, access_key.nonce))
            }
            _ => Err(ServerError::new(
                std::io::ErrorKind::InvalidData,
                "Expected AccessKey",
            )),
        },
        Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
    }
}

async fn poll_transaction(
    req: &methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest,
) -> Result<Vec<u8>, ServerError> {
    let sent_at = Instant::now();
    loop {
        match RPC.call(req).await {
            Ok(FinalExecutionOutcomeView {
                status: FinalExecutionStatus::SuccessValue(bytes),
                ..
            }) => {
                break Ok(bytes);
            }

            Ok(FinalExecutionOutcomeView {
                status: FinalExecutionStatus::Failure(e),
                ..
            }) => {
                break Err(ServerError::Transaction(e.to_string()));
            }

            Err(error) => {
                let e = error
                    .handler_error()
                    .unwrap_or(&RpcTransactionError::TimeoutError);

                match e {
                    RpcTransactionError::TimeoutError
                    | RpcTransactionError::UnknownTransaction { .. } => {
                        sleep(Duration::from_secs(2)).await;
                        continue;
                    }

                    _ => {
                        break Err(ServerError::Transaction(e.to_string()));
                    }
                }
            }

            _ => {}
        };

        if Instant::now().duration_since(sent_at).as_secs() > 60 {
            break Err(ServerError::Transaction(
                RpcTransactionError::TimeoutError.to_string(),
            ));
        };
    }
}

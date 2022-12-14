use std::{
    path::Path,
    str::FromStr,
    time::{Duration, Instant},
};

use actix::clock::sleep;
use delt_d::character::Character;
use near_crypto::{InMemorySigner, PublicKey};
use near_jsonrpc_client::{
    methods::{
        self,
        query::RpcQueryRequest,
        tx::{RpcTransactionError, TransactionInfo},
    },
    JsonRpcClient, NEAR_TESTNET_RPC_URL,
};
use near_jsonrpc_primitives::types::query::QueryResponseKind;
use near_primitives::{
    hash::CryptoHash,
    transaction::SignedTransaction,
    types::{AccountId, AccountInfo, Balance, BlockReference, Finality, FunctionArgs},
    views::{FinalExecutionOutcomeView, FinalExecutionStatus, QueryRequest},
};
use serde_json::from_slice;

use crate::{handlers::messages::ServerError, types::Content};

lazy_static::lazy_static! {
    pub static ref RPC: JsonRpcClient = JsonRpcClient::connect(NEAR_TESTNET_RPC_URL);

    static ref ADMIN: InMemorySigner = InMemorySigner::from_file(Path::new("C:/Users/j10st/.near-credentials/testnet/delt.testnet.json")).expect("error while parsing admin signer");
}

#[derive(Debug)]
pub enum Res {
    Balance(Balance),
    Character(Character),
    Success,
    Account(AccountInfo),
}

pub enum Contracts {
    DeltD,
    DeltFt,
    DeltMt,
}

impl Contracts {
    pub fn account_id(&self) -> AccountId {
        match self {
            Self::DeltD => AccountId::from_str("delt-d.delt.near").unwrap(),
            Self::DeltFt => AccountId::from_str("delt-ft.delt.near").unwrap(),
            Self::DeltMt => AccountId::from_str("delt-mt.delt.near").unwrap(),
        }
    }
}

#[derive(Clone)]
pub enum DeltMethods {
    Character(AccountId),
    FTBalance(AccountId),
    SetDefaultAttributes(Content),
    ViewAccount(AccountId),
}

impl<'a> DeltMethods {
    pub async fn call(&self) -> Result<Res, ServerError> {
        match self {
            Self::Character(account_id) => {
                let mut args = Content::new();

                args.insert("account_id", &account_id.to_string());

                match RPC
                    .call(RpcQueryRequest {
                        block_reference: BlockReference::Finality(Finality::Final),
                        request: QueryRequest::CallFunction {
                            account_id: Contracts::DeltD.account_id(),
                            method_name: "get_character".to_string(),
                            args: FunctionArgs::from(args.into_bytes()),
                        },
                    })
                    .await
                {
                    Ok(response) => match response.kind {
                        QueryResponseKind::CallResult(result) => {
                            match from_slice::<Character>(&result.result) {
                                Ok(res) => Ok(Res::Character(res)),

                                Err(_) => {
                                    Err(ServerError::UnexpectedResponse("Character".to_string()))
                                }
                            }
                        }

                        _ => Err(ServerError::UnexpectedResponse("CallResult".to_string())),
                    },

                    Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
                }
            }

            Self::FTBalance(account_id) => {
                let mut args = Content::new();

                args.insert("account_id", &account_id.to_string());

                match RPC
                    .call(methods::query::RpcQueryRequest {
                        block_reference: BlockReference::Finality(Finality::Final),
                        request: QueryRequest::CallFunction {
                            account_id: Contracts::DeltFt.account_id(),
                            method_name: "ft_balance".to_string(),
                            args: FunctionArgs::from(args.into_bytes()),
                        },
                    })
                    .await
                {
                    Ok(response) => match response.kind {
                        QueryResponseKind::CallResult(result) => {
                            match from_slice::<Balance>(&result.result) {
                                Ok(res) => Ok(Res::Balance(res)),

                                Err(e) => Err(ServerError::UnexpectedResponse(e.to_string())),
                            }
                        }

                        _ => Err(ServerError::UnexpectedResponse(
                            "expected CallResult".to_string(),
                        )),
                    },

                    Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
                }
            }

            Self::SetDefaultAttributes(attributes) => {
                let mut args = Content::new();

                args.insert("attributes", &attributes);

                let receiver_id = AccountId::from_str("delt-d.delt.testnet").unwrap();

                match get_current_nonce(&ADMIN.account_id, &ADMIN.public_key).await {
                    Ok((hash, current_nonce)) => {
                        match RPC
                            .call(methods::broadcast_tx_commit::RpcBroadcastTxCommitRequest {
                                signed_transaction: SignedTransaction::call(
                                    current_nonce + 1,
                                    ADMIN.account_id.to_owned(),
                                    receiver_id.to_owned(),
                                    &*ADMIN,
                                    10u128.pow(24),
                                    "set_default_attributes".to_string(),
                                    args.into_bytes(),
                                    5_000_000_000_000,
                                    hash,
                                ),
                            })
                            .await
                        {
                            Ok(tx) => match tx.status {
                                FinalExecutionStatus::Failure(e) => {
                                    Err(ServerError::Transaction(e.to_string()))
                                }
                                FinalExecutionStatus::SuccessValue(_) => Ok(Res::Success),
                                FinalExecutionStatus::NotStarted
                                | FinalExecutionStatus::Started => Err(ServerError::Transaction(
                                    "Unexpected Final Execution Status".to_string(),
                                )),
                            },

                            Err(e) => Err(ServerError::Transaction(e.to_string())),
                        }
                    }

                    Err(e) => Err(e),
                }
            }
            Self::ViewAccount(account_id) => {
                match RPC
                    .call(RpcQueryRequest {
                        block_reference: BlockReference::Finality(Finality::Final),
                        request: QueryRequest::ViewAccount {
                            account_id: account_id.to_owned(),
                        },
                    })
                    .await
                {
                    Ok(response) => match response.kind {
                        QueryResponseKind::CallResult(result) => {
                            match from_slice::<AccountInfo>(&result.result) {
                                Ok(res) => Ok(Res::Account(res)),

                                Err(e) => Err(ServerError::UnexpectedResponse(e.to_string())),
                            }
                        }

                        _ => Err(ServerError::UnexpectedResponse(
                            "expected CallResult".to_string(),
                        )),
                    },
                    Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
                }
            }
        }
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
            _ => Err(ServerError::UnexpectedResponse("AccessKey".to_string())),
        },
        Err(e) => Err(ServerError::Query(e.handler_error().unwrap().to_string())),
    }
}

async fn poll_transaction(
    account_id: &AccountId,
    tx_hash: &CryptoHash,
) -> Result<Vec<u8>, ServerError> {
    let sent_at = Instant::now();
    loop {
        let response = RPC
            .call(methods::tx::RpcTransactionStatusRequest {
                transaction_info: TransactionInfo::TransactionId {
                    hash: tx_hash.clone(),
                    account_id: account_id.clone(),
                },
            })
            .await;

        let received_at = Instant::now();

        if received_at.duration_since(sent_at).as_secs() > 60 {
            break Err(ServerError::Transaction(
                RpcTransactionError::TimeoutError.to_string(),
            ));
        }

        match response {
            Ok(FinalExecutionOutcomeView {
                status: FinalExecutionStatus::SuccessValue(s),
                ..
            }) => {
                break Ok(s);
            }

            Ok(FinalExecutionOutcomeView {
                status: FinalExecutionStatus::Failure(error),
                ..
            }) => {
                break Err(ServerError::Transaction(error.to_string()));
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
                };
            }

            _ => {}
        }
    }
}

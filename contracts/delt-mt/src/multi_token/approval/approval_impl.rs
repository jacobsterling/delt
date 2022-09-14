use super::MultiTokenApproval;
use crate::multi_token::{
    core::{MultiToken, GAS_FOR_MT_TRANSFER_CALL},
    token::{Approval, TokenId},
    utils::{bytes_for_approved_account_id, expect_approval, refund_deposit, Entity},
};
use near_sdk::{assert_one_yocto, env, ext_contract, require, AccountId, Balance, Promise};
use std::collections::HashMap;

const NO_DEPOSIT: Balance = 0;

#[ext_contract(ext_approval_receiver)]
pub trait MultiTokenReceiver {
    fn mt_on_approve(
        &mut self,
        tokens: Vec<TokenId>,
        owner_id: AccountId,
        approval_ids: Vec<u64>,
        msg: String,
    );
}

impl MultiTokenApproval for MultiToken {
    fn mt_approve(
        &mut self,
        token_ids: Vec<TokenId>,
        amounts: Vec<Balance>,
        grantee_id: AccountId,
        msg: Option<String>,
    ) -> Option<Promise> {
        let approver_id = env::predecessor_account_id();

        // Unwrap to check if approval supported
        let by_token = expect_approval(self.approvals_by_token_id.as_mut(), Entity::Token);

        // Get some IDs and check if approval management supported both for contract & token
        let next_id_by_token = expect_approval(self.next_approval_id_by_id.as_mut(), Entity::Token);

        let mut next_approval_ids = Vec::new();

        let mut used_storage = 0;

        for i in 0..token_ids.len() {
            let token_id = &token_ids[i];
            let amount = amounts[i];

            // Get the balance to check if user has enough tokens
            let approver_balance = self
                .balances_per_token
                .get(token_id)
                .unwrap()
                .get(&approver_id)
                .unwrap_or(0);
            require!(approver_balance >= amount, "Not enough balance to approve");

            let current_next_id = expect_approval(next_id_by_token.get(token_id), Entity::Token);

            let new_approval = Approval {
                amount,
                approval_id: current_next_id,
            };
            env::log_str(format!("New approval: {:?}", new_approval).as_str());

            // Get approvals for this token
            let mut by_owner = by_token.get(token_id).unwrap_or_default();
            let by_grantee = by_owner.get(&approver_id);

            let mut grantee_to_approval = if let Some(by_grantee) = by_grantee {
                by_grantee.clone()
            } else {
                HashMap::new()
            };
            let old_approval_id = grantee_to_approval.insert(grantee_id.clone(), new_approval);

            by_owner.insert(approver_id.clone(), grantee_to_approval);
            by_token.insert(token_id, &by_owner);

            next_approval_ids.push(current_next_id + 1);

            env::log_str(format!("Updated approvals by id: {:?}", old_approval_id).as_str());
            used_storage += if old_approval_id.is_none() {
                bytes_for_approved_account_id(&grantee_id)
            } else {
                0
            };
        }

        refund_deposit(used_storage);

        msg.map(|msg| {
            ext_approval_receiver::MultiTokenReceiverExt::mt_on_approve(
                ext_approval_receiver::MultiTokenReceiverExt {
                    deposit: NO_DEPOSIT,
                    static_gas: env::prepaid_gas() - GAS_FOR_MT_TRANSFER_CALL,
                    gas_weight: near_sdk::GasWeight(1),
                    account_id: grantee_id,
                },
                token_ids,
                approver_id,
                next_approval_ids,
                msg,
            )
        })
    }

    fn mt_revoke(&mut self, token_ids: Vec<TokenId>, account_id: AccountId) {
        assert_one_yocto();
        let owner_id = env::predecessor_account_id();

        // Get all approvals for token, will panic if approval extension is not used for contract or token
        let by_token = expect_approval(self.approvals_by_token_id.as_mut(), Entity::Contract);

        for token_id in token_ids.iter() {
            // Remove approval for user & also clean maps to save space it it's empty
            let mut by_owner = expect_approval(by_token.get(token_id), Entity::Token);
            let by_grantee = by_owner.get_mut(&owner_id);

            if let Some(grantee_to_approval) = by_grantee {
                grantee_to_approval.remove(&account_id);
                // The owner has no more approvals for this token.
                if grantee_to_approval.is_empty() {
                    by_owner.remove(&owner_id);
                }
            }

            if by_owner.is_empty() {
                by_token.remove(token_id);
            }
        }
    }

    fn mt_revoke_all(&mut self, token_ids: Vec<TokenId>) {
        assert_one_yocto();
        let owner_id = env::predecessor_account_id();

        // Get all approvals for token, will panic if approval extension is not used for contract or token
        let approvals = expect_approval(self.approvals_by_token_id.as_mut(), Entity::Contract);

        for token_id in token_ids.iter() {
            let mut by_token = expect_approval(approvals.get(token_id), Entity::Token);
            by_token.remove(&owner_id);
        }
    }

    fn mt_is_approved(
        &self,
        token_ids: Vec<TokenId>,
        approved_account_id: AccountId,
        amounts: Vec<Balance>,
        approval_ids: Option<Vec<u64>>,
    ) -> bool {
        let approval_ids = approval_ids.unwrap_or_default();
        require!(
            approval_ids.is_empty() || approval_ids.len() == token_ids.len(),
            "token_ids and approval_ids must have equal size"
        );

        let owner_id = env::predecessor_account_id();
        let by_token = expect_approval(self.approvals_by_token_id.as_ref(), Entity::Contract);
        env::log_str(format!("{:?}", by_token).as_str());

        for i in 0..token_ids.len() {
            let token_id = &token_ids[i];
            let amount = amounts[i];
            let by_owner = by_token.get(token_id).unwrap_or_default();

            let grantee_to_approval = match by_owner.get(&owner_id) {
                Some(grantee_to_approval) => grantee_to_approval,
                None => return false,
            };

            let approval = match grantee_to_approval.get(&approved_account_id) {
                Some(approval) => approval,
                None => return false,
            };

            if !approval.amount.eq(&amount) {
                return false;
            }

            if let Some(given_approval) = approval_ids.get(i) {
                if !approval.approval_id.eq(given_approval) {
                    return false;
                }
            }
        }
        true
    }
}

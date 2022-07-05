use std::ops::Sub;

use near_sdk::collections::UnorderedMap;
use near_sdk::env::log_str;
use near_sdk::BlockHeight;
use serde::{Deserialize, Serialize};
use serde_json::to_string;

use crate::multi_token::events::{MtBid, MtListed, MtUnlisted};

use crate::{
    multi_token::{
        core::StorageKey,
        token::ClearedApproval,
        utils::{check_and_apply_approval, expect_approval, refund_deposit_to_account, Entity},
    },
    *,
};

#[derive(Serialize, Deserialize)]
pub struct JsonListing {
    seller_id: AccountId,
    listing: Listing,
}

pub trait Market {
    fn create_listing(
        &mut self,
        token_id: TokenId,
        price: SalePriceInYoctoDelt,
        amount: Balance,
        auction: bool,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
    ) -> (AccountId, Option<Vec<ClearedApproval>>);

    fn purchase(&mut self, seller_id: AccountId, token_id: TokenId);

    fn bid(&mut self, seller_id: AccountId, token_id: TokenId);

    fn end_auction(&mut self, seller_id: AccountId, token_id: TokenId);

    fn remove_listing(&mut self, seller_id: AccountId, token_id: TokenId);

    fn get_listings(&self, token_id: TokenId) -> Vec<JsonListing>;
}

pub type SalePriceInYoctoDelt = U128;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
pub struct Listing {
    pub amount: Balance,
    pub auction: bool,
    pub buyer: Option<AccountId>,
    pub init_price: SalePriceInYoctoDelt,
    pub price: SalePriceInYoctoDelt,
    pub created_time: BlockHeight,
    pub storage_refund: (AccountId, u64),
    pub memo: Option<String>,
}

#[near_bindgen]
impl Market for MTContract {
    #[payable]
    fn create_listing(
        &mut self,
        token_id: TokenId,
        price: SalePriceInYoctoDelt,
        amount: Balance,
        auction: bool,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
    ) -> (AccountId, Option<Vec<ClearedApproval>>) {
        let lister_id = env::signer_account_id();

        let initial_storage_usage =
            Some(&lister_id).map(|account_id| (account_id, env::storage_usage()));

        let (seller_id, old_approvals) = if let Some((account_id, approval_id)) = approval {
            // If an approval was provided, ensure it meets requirements.
            let approvals =
                expect_approval(self.tokens.approvals_by_token_id.as_mut(), Entity::Contract);

            let mut token_approvals = approvals
                .get(&token_id)
                .unwrap_or_else(|| panic!("Approvals not supported for token {}", token_id));

            (
                account_id.to_owned(),
                Some(check_and_apply_approval(
                    &mut token_approvals,
                    &account_id,
                    &lister_id,
                    &approval_id,
                    amount,
                )),
            )
        } else {
            // No approval.
            (lister_id.to_owned(), None)
        };

        let mut token_listings = self
            .tokens
            .listings
            .get(&token_id)
            .unwrap_or(UnorderedMap::new(StorageKey::ListingByAccount));

        require!(
            token_listings.get(&seller_id).is_none(),
            "Token already listed"
        );

        require!(
            amount
                <= self
                    .tokens
                    .mt_balance_of(seller_id.clone(), token_id.clone())
                    .0,
            "Given amount is greater than seller balance"
        );

        let mut listing = Listing {
            amount,
            auction,
            buyer: None,
            init_price: price,
            price,
            created_time: env::epoch_height(),
            storage_refund: (lister_id.clone(), u64::MAX),
            memo: memo.clone(),
        };

        token_listings.insert(&seller_id, &listing);

        // create listing
        self.tokens.listings.insert(&token_id, &token_listings);

        if let Some((id, usage)) = initial_storage_usage {
            let storage_used = env::storage_usage() - usage;

            listing.storage_refund = (lister_id.clone(), storage_used.clone());

            token_listings.insert(&seller_id, &listing);

            self.tokens.listings.insert(&token_id, &token_listings);
        }

        MtListed {
            seller: &seller_id,
            token_ids: &[&token_id],
            amounts: &[&amount.to_string()],
            lister_id: &lister_id,
            memo: memo.as_deref(),
            auction: &auction,
            price: &price,
        }
        .emit();

        (seller_id.clone(), old_approvals)
    }

    fn bid(&mut self, seller_id: AccountId, token_id: TokenId) {
        let mut listing = self
            .tokens
            .listings
            .get(&token_id)
            .unwrap()
            .get(&seller_id)
            .unwrap();

        require!(listing.auction, "Listing not auctioned");

        //1 epoch ~ 12 hours
        require!(
            listing.created_time + 2 > env::epoch_height(),
            "Auction has ended"
        );

        let (lister_id, _) = listing.storage_refund.clone();

        require!(
            seller_id != env::signer_account_id() && lister_id.clone() != env::signer_account_id(),
            "Seller cannot bid on listing"
        );

        require!(
            env::attached_deposit() >= listing.price.0.clone(),
            "Insufficient payment"
        );

        //refund previous bidder

        if let Some(prev_bidder) = listing.buyer {
            Promise::new(prev_bidder).transfer(listing.price.0.clone());
        }

        MtBid {
            seller: &seller_id,
            token_ids: &[&token_id],
            amounts: &[&listing.amount.to_string()],
            bidder: &env::signer_account_id(),
            price: &U128(listing.price.0.clone()),
            bid: &U128(env::attached_deposit()),
        }
        .emit();

        listing.price = U128(env::attached_deposit());
        listing.buyer = Some(env::signer_account_id());

        self.tokens
            .listings
            .get(&token_id)
            .unwrap()
            .insert(&seller_id, &listing);
    }

    fn purchase(&mut self, seller_id: AccountId, token_id: TokenId) {
        let listing = self
            .tokens
            .listings
            .get(&token_id)
            .unwrap()
            .get(&seller_id)
            .unwrap();

        require!(!listing.auction, "Listing not auctioned");

        let (lister_id, storage) = listing.storage_refund;

        require!(
            seller_id != env::signer_account_id() && lister_id != env::signer_account_id(),
            "Seller cannot bid on listing"
        );

        require!(
            env::attached_deposit() >= listing.price.0,
            "Insufficient payment"
        );

        self.tokens.internal_transfer(
            &seller_id,
            &env::signer_account_id(),
            &token_id,
            listing.amount,
            &None,
        );

        Promise::new(env::signer_account_id()).transfer(env::attached_deposit() - listing.price.0);

        Promise::new(seller_id.clone()).transfer(listing.price.0);

        self.tokens
            .listings
            .get(&token_id)
            .unwrap()
            .remove(&seller_id);

        Promise::new(seller_id.clone()).transfer(env::storage_byte_cost() * Balance::from(storage));

        MtUnlisted {
            seller: &seller_id,
            buyer: listing.buyer.as_ref(),
            token_ids: &[&token_id],
            amounts: &[&listing.amount.to_string()],
            lister_id: &lister_id,
            memo: listing.memo.as_deref(),
            auction: &false,
            price: &U128(listing.price.0),
        }
        .emit();
    }

    fn end_auction(&mut self, seller_id: AccountId, token_id: TokenId) {
        let mut listing = self
            .tokens
            .listings
            .get(&token_id)
            .unwrap()
            .get(&seller_id)
            .unwrap();

        require!(listing.auction, "Listing not auctioned");

        let (lister_id, storage) = listing.storage_refund;

        require!(
            seller_id == env::signer_account_id() || lister_id == env::signer_account_id(),
            "Only autorized users can end aution"
        );

        log_str(&env::epoch_height().to_string());

        if let Some(ref highest_bidder) = listing.buyer {
            if listing.created_time + 2 <= env::epoch_height() {
                self.tokens.internal_transfer(
                    &seller_id,
                    &highest_bidder,
                    &token_id,
                    listing.amount.clone(),
                    &None,
                );

                Promise::new(seller_id.clone()).transfer(listing.price.0);
            } else {
                require!(
                    self.tokens.owner_id == env::signer_account_id(),
                    "Not authorised to end auction"
                );

                //refunding to highest bidder
                Promise::new(highest_bidder.to_owned()).transfer(listing.price.0);
            }
        }

        self.tokens
            .listings
            .get(&token_id)
            .unwrap()
            .remove(&seller_id);

        Promise::new(seller_id.clone()).transfer(env::storage_byte_cost() * Balance::from(storage));

        MtUnlisted {
            seller: &seller_id,
            buyer: listing.buyer.as_ref(),
            token_ids: &[&token_id],
            amounts: &[&listing.amount.to_string()],
            lister_id: &lister_id,
            memo: listing.memo.as_deref(),
            auction: &true,
            price: &U128(listing.price.0),
        }
        .emit();
    }

    fn remove_listing(&mut self, seller_id: AccountId, token_id: TokenId) {
        let listing = self
            .tokens
            .listings
            .get(&token_id)
            .unwrap()
            .get(&seller_id)
            .unwrap();

        require!(!listing.auction, "Listing is auctioned");

        let (lister_id, storage) = listing.storage_refund;

        require!(
            seller_id == env::signer_account_id()
                || lister_id == env::signer_account_id()
                || self.tokens.owner_id == env::signer_account_id(),
            "Not authorised to remove listing"
        );

        self.tokens
            .listings
            .get(&token_id)
            .unwrap()
            .remove(&seller_id);

        Promise::new(seller_id.clone()).transfer(env::storage_byte_cost() * Balance::from(storage));

        MtUnlisted {
            seller: &seller_id,
            buyer: listing.buyer.as_ref(),
            token_ids: &[&token_id],
            amounts: &[&listing.amount.to_string()],
            lister_id: &lister_id,
            memo: listing.memo.as_deref(),
            auction: &false,
            price: &U128(listing.price.0),
        }
        .emit();
    }

    fn get_listings(&self, token_id: TokenId) -> Vec<JsonListing> {
        self.tokens
            .listings
            .get(&token_id)
            .unwrap()
            .into_iter()
            .map(|(k, v)| JsonListing {
                seller_id: k,
                listing: v,
            })
            .collect::<Vec<_>>()
    }
}

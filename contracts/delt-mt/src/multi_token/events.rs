use near_sdk::{json_types::U128, AccountId};
use serde::Serialize;

use crate::{event::NearEvent, SalePriceInYoctoDelt};

#[must_use]
#[derive(Serialize, Debug, Clone)]
pub struct MtMint<'a> {
    pub owner_id: &'a AccountId,
    pub token_ids: &'a [&'a str],
    pub amounts: &'a [&'a str],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<&'a str>,
}

impl MtMint<'_> {
    pub fn emit(self) {
        Self::emit_many(&[self])
    }

    pub fn emit_many(data: &[MtMint<'_>]) {
        new_245_v1(Nep245EventKind::MtMint(data)).emit()
    }
}

#[must_use]
#[derive(Serialize, Debug, Clone)]
pub struct MtBurn<'a> {
    pub owner_id: &'a AccountId,
    pub token_ids: &'a [&'a str],
    pub amounts: &'a [&'a str],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<&'a str>,
}

impl MtBurn<'_> {
    pub fn emit(self) {
        Self::emit_many(&[self])
    }

    pub fn emit_many(data: &[MtBurn<'_>]) {
        new_245_v1(Nep245EventKind::MtBurn(data)).emit()
    }
}

#[must_use]
#[derive(Serialize, Debug, Clone)]
pub struct MtTransfer<'a> {
    pub old_owner_id: &'a AccountId,
    pub new_owner_id: &'a AccountId,
    pub token_ids: &'a [&'a str],
    pub amounts: &'a [&'a str],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub authorized_id: Option<&'a AccountId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<&'a str>,
}

impl MtTransfer<'_> {
    pub fn emit(self) {
        Self::emit_many(&[self])
    }

    pub fn emit_many(data: &[MtTransfer<'_>]) {
        new_245_v1(Nep245EventKind::MtTransfer(data)).emit()
    }
}

#[must_use]
#[derive(Serialize, Debug, Clone)]
pub struct MtListed<'a> {
    pub seller: &'a AccountId,
    pub token_ids: &'a [&'a str],
    pub amounts: &'a [&'a str],
    pub auction: &'a bool,
    pub price: &'a SalePriceInYoctoDelt,
    pub lister_id: &'a AccountId,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<&'a str>,
}

impl MtListed<'_> {
    pub fn emit(self) {
        Self::emit_many(&[self])
    }

    pub fn emit_many(data: &[MtListed<'_>]) {
        new_245_v1(Nep245EventKind::MtListed(data)).emit()
    }
}

#[must_use]
#[derive(Serialize, Debug, Clone)]
pub struct MtUnlisted<'a> {
    pub seller: &'a AccountId,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub buyer: Option<&'a AccountId>,
    pub token_ids: &'a [&'a str],
    pub amounts: &'a [&'a str],
    pub auction: &'a bool,
    pub price: &'a SalePriceInYoctoDelt,
    pub lister_id: &'a AccountId,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<&'a str>,
}

impl MtUnlisted<'_> {
    pub fn emit(self) {
        Self::emit_many(&[self])
    }

    pub fn emit_many(data: &[MtUnlisted<'_>]) {
        new_245_v1(Nep245EventKind::MtUnlisted(data)).emit()
    }
}

#[must_use]
#[derive(Serialize, Debug, Clone)]
pub struct MtBid<'a> {
    pub seller: &'a AccountId,
    pub token_ids: &'a [&'a str],
    pub amounts: &'a [&'a str],
    pub bidder: &'a AccountId,
    pub price: &'a SalePriceInYoctoDelt,
    pub bid: &'a SalePriceInYoctoDelt,
}

impl MtBid<'_> {
    pub fn emit(self) {
        Self::emit_many(&[self])
    }

    pub fn emit_many(data: &[MtBid<'_>]) {
        new_245_v1(Nep245EventKind::MtBid(data)).emit()
    }
}

#[derive(Serialize, Debug)]
pub(crate) struct Nep245Event<'a> {
    version: &'static str,
    #[serde(flatten)]
    event_kind: Nep245EventKind<'a>,
}

#[derive(Serialize, Debug)]
#[serde(tag = "event", content = "data")]
#[serde(rename_all = "snake_case")]
#[allow(clippy::enum_variant_names)]
enum Nep245EventKind<'a> {
    MtMint(&'a [MtMint<'a>]),
    MtTransfer(&'a [MtTransfer<'a>]),
    MtBurn(&'a [MtBurn<'a>]),
    MtListed(&'a [MtListed<'a>]),
    MtUnlisted(&'a [MtUnlisted<'a>]),
    MtBid(&'a [MtBid<'a>]),
}

fn new_245<'a>(version: &'static str, event_kind: Nep245EventKind<'a>) -> NearEvent<'a> {
    NearEvent::Nep245(Nep245Event {
        version,
        event_kind,
    })
}

fn new_245_v1(event_kind: Nep245EventKind) -> NearEvent {
    new_245("1.0.0", event_kind)
}

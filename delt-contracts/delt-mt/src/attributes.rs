use crate::*;
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string, Error, Map, Value};

pub trait TokenAttributeHandler {
    fn read_attributes(&self, token_id: &TokenId) -> String;

    fn convert_attributes(attributes: String) -> Map<String, Value>;

    fn set_attributes(&mut self, token_id: TokenId, attrs: Map<String, Value>);

    fn mt_attrs(&self, token_id: &TokenId) -> Option<TokenAttrs>;

    fn mt_batch_attrs(&self, token_ids: Vec<TokenId>) -> Vec<Option<TokenAttrs>>;

    fn merge_attrs(attrs: Map<String, Value>, new_attrs: Map<String, Value>) -> Map<String, Value>;

    fn mt_merge(
        &mut self,
        token_owner_id: AccountId,
        token_ids: Vec<TokenId>,
        amount: Option<Balance>,
        new_metadata: Option<TokenMetadata>,
    ) -> Token;

    fn token_id_by_attrs(&self, attrs: Map<String, Value>) -> Option<Token>;
}

#[derive(Serialize, Deserialize)]
pub struct Stat {
    pub quality: String,
    pub tier: u64,
    pub value: u64,
}

#[derive(Serialize, Deserialize)]
pub struct TokenAttrs {
    pub token_id: TokenId,
    pub attrs: Map<String, Value>,
}

#[near_bindgen]
impl TokenAttributeHandler for MTContract {
    fn read_attributes(&self, token_id: &TokenId) -> String {
        self.tokens
            .token_metadata_by_id
            .as_ref()
            .unwrap()
            .get(&token_id)
            .unwrap()
            .extra
            .unwrap()
    }

    fn mt_attrs(&self, token_id: &TokenId) -> Option<TokenAttrs> {
        Some(TokenAttrs {
            token_id: (&token_id).to_string(),
            attrs: MTContract::convert_attributes(
                self.tokens
                    .token_metadata_by_id
                    .as_ref()
                    .unwrap()
                    .get(&token_id)
                    .unwrap()
                    .extra
                    .unwrap_or_default(),
            ),
        })
    }

    fn set_attributes(&mut self, token_id: TokenId, attrs: Map<String, Value>) {
        let attributes = Some(to_string(&attrs).unwrap_or_default());

        let mut metadata: TokenMetadata = self
            .tokens
            .token_metadata_by_id
            .as_ref()
            .unwrap()
            .get(&token_id)
            .unwrap();

        metadata.extra = attributes;

        self.tokens
            .token_metadata_by_id
            .as_mut()
            .and_then(|by_id| by_id.insert(&token_id, &metadata));
    }

    fn convert_attributes(attributes: String) -> Map<String, Value> {
        (from_str(&attributes) as Result<Value, Error>)
            .unwrap()
            .as_object()
            .unwrap()
            .clone()
    }

    fn merge_attrs(
        mut attrs: Map<String, Value>,
        new_attrs: Map<String, Value>,
    ) -> Map<String, Value> {
        for (attr_key, attr) in new_attrs {
            if !attrs.contains_key(&attr_key) {
                attrs.insert(attr_key, attr);
            } else {
                for (stat_key, stat) in attr.as_object().unwrap().into_iter() {
                    attrs
                        .get_mut(&attr_key)
                        .unwrap()
                        .as_object_mut()
                        .unwrap()
                        .insert(stat_key.to_string(), stat.to_owned());
                }
            }
        }
        attrs
    }

    fn mt_batch_attrs(&self, token_ids: Vec<TokenId>) -> Vec<Option<TokenAttrs>> {
        token_ids
            .iter()
            .map(|token_id| self.mt_attrs(token_id))
            .collect()
    }

    fn token_id_by_attrs(&self, attrs: Map<String, Value>) -> Option<Token> {
        let attributes = Some(to_string(&attrs).unwrap_or_default());

        assert!(attributes.is_some(), "attributes must not be empty");

        if self.tokens.owner_by_id.len() > 0 {
            let token = self
                .tokens
                .mt_tokens(Some(U128(0)), Some(self.tokens.owner_by_id.len()))
                .into_iter()
                .filter(|token| {
                    MTContract::convert_attributes(
                        token
                            .metadata
                            .as_ref()
                            .unwrap()
                            .extra
                            .as_ref()
                            .unwrap()
                            .to_string(),
                    ) == attrs
                })
                .next();

            token
        } else {
            None
        }
    }

    #[payable]
    fn mt_merge(
        &mut self,
        owner_id: AccountId,
        token_ids: Vec<TokenId>,
        amount: Option<Balance>,
        mut new_metadata: Option<TokenMetadata>,
    ) -> Token {
        let token_attrs = self.mt_batch_attrs(token_ids.clone());

        let mut new_attrs = Map::new();

        for token in token_attrs.into_iter() {
            assert!(
                self.mt_balance_of(owner_id.clone(), token.as_ref().unwrap().token_id.clone())
                    .0
                    >= amount.unwrap_or(1)
            );
            new_attrs = MTContract::merge_attrs(new_attrs, token.unwrap().attrs)
        }

        let existing_base_token = self.token_id_by_attrs(new_attrs.clone());

        if existing_base_token.is_none() {
            let token_supplys = self
                .tokens
                .mt_token(token_ids.clone())
                .into_iter()
                .enumerate()
                .filter_map(|(index, r)| (r.unwrap().supply == 1u128).then(|| index))
                .collect::<Vec<_>>();

            if token_supplys.first().clone().is_some() {
                for i in 0..token_ids.len() {
                    if &(&token_ids.get(i).unwrap()).to_string()
                        != &token_ids[token_supplys.first().unwrap().to_owned()]
                    {
                        self.tokens.internal_burn(
                            owner_id.clone(),
                            (&token_ids.get(i).unwrap()).to_string(),
                            amount.unwrap_or(1),
                            Some(String::from("merged")),
                        )
                    }
                }

                self.set_attributes(
                    token_ids[token_supplys.first().unwrap().to_owned()].clone(),
                    new_attrs,
                );

                let token = self.tokens.mt_token(vec![token_ids
                    [token_supplys.first().unwrap().to_owned()]
                .clone()]);

                token.into_iter().next().unwrap().unwrap()
            } else {
                require!(
                    new_metadata.is_some(),
                    "New metadata must be provided for this merge."
                );

                new_metadata.as_mut().unwrap().extra =
                    Some(to_string(&new_attrs).unwrap_or_default());

                for i in 0..token_ids.len() {
                    self.tokens.internal_burn(
                        owner_id.clone(),
                        (&token_ids.get(i).unwrap()).to_string(),
                        amount.unwrap_or(1),
                        Some(String::from("merged")),
                    )
                }

                self.tokens.internal_mint(
                    env::signer_account_id(),
                    Some(amount.unwrap_or(1)),
                    new_metadata,
                    Some(owner_id.clone()),
                )
            }
        } else {
            for i in 0..token_ids.len() {
                self.tokens.internal_burn(
                    owner_id.clone(),
                    (&token_ids.get(i).unwrap()).to_string(),
                    amount.unwrap_or(1),
                    Some(String::from("merged")),
                )
            }

            self.tokens.internal_mint_existing(
                env::signer_account_id(),
                existing_base_token.unwrap(),
                amount.unwrap_or(1),
                Some(owner_id.clone()),
            )
        }
    }
}

import { PlayerAttributes } from "~~/game/entities/player"

export interface Stat {
  [statKey: string]: {
    trait: string,
    tier: number,
    value: number
  },
}

export type Attr = { [AttrKey: string]: Stat[] }

export interface Token {
  tokenId: string,
  slug: string,
  type: string,
  upgradable: boolean,
  attributes: Attr[],
  owner: string,
  supply?: number,
  amount?: number,
  burned?: boolean
  svg?: string,
}

export interface TokenMetadata {
  title?: String, // ex. "Arch Nemesis: Mail Carrier" or "Parcel #5055"
  description?: String, // free-form description
  media?: String, // URL to associated media, preferably to decentralized, content-addressed storage
  media_hash?: number, // Base64-encoded sha256 hash of content referenced by the `media` field. Required if `media` is included.
  copies?: number, // number of copies of this set of metadata in existence when token was minted.
  issued_at?: number, // When token was issued or minted, Unix epoch in milliseconds
  expires_at?: number, // When token expires, Unix epoch in milliseconds
  starts_at?: number, // When token starts being valid, Unix epoch in milliseconds
  updated_at?: number, // When token was last updated, Unix epoch in milliseconds
  extra?: String, // anything extra the NFT wants to store on-chain. Can be stringified JSON.
  reference?: String, // URL to an off-chain JSON file with more info.
  reference_hash?: number, // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.
}

export interface StakeId {
  contract_id: string,

  token: { token_id?: string, balance?: number },
}

export interface PoolConfig {
  pool_id: string,
  pool_results: string[],
  required_xp: number,
}

export type Stakes = { [result: string]: { [staker: string]: { [stake: string]: string } } } // stake as StakeId mapped to potential receiver

export type Pool = {
  owner: string,

  required_xp: number,

  required_stakes: Stakes,

  active: boolean,

  resolved: boolean,

  result?: string,
}

export interface Character {
  xp: number,

  attributes: PlayerAttributes,
}
// pool result -> staker -> (stake / potential rewards)

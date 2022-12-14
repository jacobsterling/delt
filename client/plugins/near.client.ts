// import dotenv from "dotenv"
import { keyStores, connect, Contract, WalletConnection, Near, utils } from "near-api-js"

const keyStore = new keyStores.BrowserLocalStorageKeyStore()

const api: Near = await connect({
  headers: {},
  helperUrl: "https://helper.testnet.near.org",
  keyStore,
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org"
})

export interface Stat {
  [statKey: string]: {
    trait: string,
    tier: number,
    value: number
  },
}

export interface Attr {
  [AttrKey: string]: Stat[],
}

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

export interface Client {
  wallet: WalletConnection,
  deltd: Contract,
  utils: typeof utils
  // decode: (str: string) => string,
  // encode: (str: string) => string,
}

export default defineNuxtPlugin(() => {
  const wallet = new WalletConnection(api, "delt")
  // process.env = useRuntimeConfig()
  const near = reactive<Client>({
    // decode: (str: string) => {
    //   return Buffer.from(str, "base64").toString("binary")
    // },
    deltd: markRaw(new Contract(
      wallet.account(), // the account object that is connecting
      "delt-d.delt.testnet", // name of contract you're connecting to
      {
        changeMethods: ["register"], // change methods modify state
        viewMethods: ["get_character"] // view methods do not change state but usually return a value
      })),
    // encode: (str: string) => {
    //   return Buffer.from(str, "binary").toString("base64")
    // },
    utils,
    wallet
  }) as Client
  return {
    provide: {
      near
    }
  }
})

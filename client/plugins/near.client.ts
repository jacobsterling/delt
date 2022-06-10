import * as buffer from "buffer"

// import dotenv from "dotenv"
import { keyStores, connect, Contract, WalletConnection, Near, utils } from "near-api-js"

(window as any).Buffer = buffer.Buffer

// dotenv.config()
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
  player: Object,
  deltm: Contract,
  utils: typeof utils
  deltmMetadata: () => Promise<Object>,
  decode: (str: string) => string,
  encode: (str: string) => string,
  getPlayerProfile: () => Promise<void>
  mint: (unminted: Token) => Promise<boolean>
}

export default defineNuxtPlugin(() => {
  const wallet = new WalletConnection(api, "delt")
  process.env = useRuntimeConfig()
  const near = reactive<Client>({
    decode: (str: string) => {
      return Buffer.from(str, "base64").toString("binary")
    },
    deltm: markRaw(new Contract(
      wallet.account(), // the account object that is connecting
      "delt.testnet", // name of contract you're connecting to
      {
        changeMethods: ["nft_mint"], // change methods modify state
        viewMethods: ["nft_metadata", "nft_token"] // view methods do not change state but usually return a value
      })),
    deltmMetadata: async () => {
      return await near.deltm.nft_metadata({ accountId: near.wallet.getAccountId() })
    },
    encode: (str: string) => {
      return Buffer.from(str, "binary").toString("base64")
    },
    getPlayerProfile: async () => {
      const user = await useAccount(wallet.getAccountId())
      near.player = { imageURL: user.imageURL, level: user.level, type: user.type, userSlug: useSlug(user.username), username: user.username || wallet.getAccountId().split(".")[0] }
      return near.player
    },
    mint: async (unminted: Token) => {
      const metadata: TokenMetadata = {
        copies: unminted.supply,
        description: `Delt multitoken of type: ${unminted.type}`,
        issued_at: Date.now(),
        media: unminted.svg,
        media_hash: near.encode(unminted.svg),
        title: "pirate king"
      }
      const result = await near.deltm.nft_mint(
        {
          metadata,
          receiver_id: near.wallet.getAccountId(),
          token_id: unminted.tokenId
        },
        near.utils.format.parseNearAmount("0.01")
        //
      )
      console.log(result)
      return true
    },
    player: undefined,
    utils,
    wallet
  })
  return {
    provide: {
      near
    }
  }
})

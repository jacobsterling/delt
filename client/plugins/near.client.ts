
import { Buffer } from "buffer"

import { Contract, WalletConnection, utils } from "near-api-js"
import { connection } from "~~/server/app/near"

import { Character, Pool, PoolConfig, StakeId, Token } from "~~/types/contracts"

export interface Client {
  wallet: WalletConnection,
  deltft: {
    contract: Contract,
    register: (account_id?: string) => Promise<any>,
    register_stake: (amount: number) => Promise<any>,
    transfer: (receiver_id: string, amount: number, memo?: string) => Promise<any>,
  },
  deltmt: {
    contract: Contract,
    register: (account_id?: string) => Promise<any>,
    register_stake: (id: string, amount: number) => Promise<any>,
    transfer: (receiver_id: string, id: string, amount: number) => Promise<any>,
    merge_attrs: (attrs: Attr, new_attrs: Attr) => Promise<any>,
    mt_attrs: (token_id: string) => Promise<any>,
    mt_batch_attrs: (token_ids: string[]) => Promise<any>,
    mt_token: (token_ids: string[]) => Promise<(Token | undefined)[]>
    token_id_by_attrs: (attrs: Attr) => Promise<any>,
    create_listing: (token_id: string,
      price: number,
      amount: number,
      auction: boolean,
      approval?: [string, number],
      memo?: string) => Promise<any>,
    purchase: (seller_id: string, token_id: string) => Promise<any>,
    bid: (seller_id: string, token_id: string) => Promise<any>,
    end_auction: (seller_id: string, token_id: string) => Promise<any>,
    remove_listing: (seller_id: string, token_id: string) => Promise<any>,
    get_listings: (token_id: string) => Promise<any>,
    mt_balance_of: (account_id: string, token_id: string) => Promise<any>,
    mt_batch_balance_of: (account_id: string, token_ids: string[]) => Promise<any>,
    mt_supply: (token_id: string) => Promise<any>,
    mt_batch_supply: (token_ids: string[]) => Promise<any>,
    mt_tokens_for_owner: (account_id: string, from_index?: number, limit?: number) => Promise<Token[]>
  },
  deltd: {
    contract: Contract,
    register: (account_id?: string) => Promise<any>,
    stake: (stake_id: StakeId,
      staker_id: string,
      pool_result: string,
      pool_id: string,
      receivers: { [receiver: string]: string }
    ) => Promise<any>,
    unstake: (stake_id: StakeId,
      staker_id: string,
    ) => Promise<any>,
    create_pool: (pool_config: PoolConfig) => Promise<any>,
    get_pools: (owner?: string) => Promise<{ [pool_id: string]: Pool }>,
    get_pool: (id: string) => Promise<Pool | undefined>,
    get_stakes: (staker_id: string) => Promise<[StakeId, string | undefined][]>
    verify_stake: (stake_id: StakeId, check_id?: string) => Promise<any>,
    get_character: (account_id: string) => Promise<Character>,
  },
  utils: typeof utils,
}

export default defineNuxtPlugin(async () => {
  (window as any).Buffer = Buffer

  const wallet = await connection()

  process.env = { NEAR_NO_LOGS: "rrrr" }

  const near = reactive<Client>({
    deltd: {
      contract: new Contract(
        wallet.account(),
        "delt-d.delt.testnet",
        {
          changeMethods: ["register", "stake", "unstake", "create_pool"],
          viewMethods: ["get_character", "get_pools", "verify_stake"]
        }),
      create_pool: async (pool_config) => {
        return await near.deltd.contract.create_pool(pool_config, "300000000000000", "1000000000000000000000000")
      },
      get_character: async (account_id) => {
        try {
          const { xp, attributes } = await near.deltd.contract.get_character({ account_id })

          return { attributes: JSON.parse(attributes), xp } as Character
        } catch (e: any) {
          throw createError({ statusCode: 404, statusMessage: "Error fetching character", data: "account_id" })
        }
      },
      get_pool: async (id) => {
        const res = await near.deltd.get_pools()

        return res[id]
      },
      get_pools: async (owner) => {
        const res = await near.deltd.contract.get_pools({ owner })

        return res ? res as { [pool_id: string]: Pool } : {}
      },
      get_stakes: async (staker_id) => {
        const res = await near.deltd.contract.get_stakes({ staker_id })

        return res ? res as [StakeId, string | undefined][] : []
      },
      register: async (account_id) => {
        return await near.deltd.contract.register({ account_id }, "300000000000000", "1000000000000000000000000")
      },
      stake: async (
        stake_id,
        staker_id,
        pool_result,
        pool_id,
        receivers
      ) => {
        return await near.deltd.contract.stake({ pool_id, pool_result, receivers, stake_id, staker_id }, "300000000000000", "1000000000000000000000000")
      },
      unstake: async (
        stake_id,
        staker_id
      ) => {
        return await near.deltd.contract.unstake({ stake_id, staker_id }, "300000000000000", "1000000000000000000000000")
      },
      verify_stake: async (stake_id: StakeId, check_id?: string) => {
        return await near.deltd.contract.verify_stake({ check_id, stake_id })
      }
    },
    deltft: {
      contract: new Contract(
        wallet.account(), // the account object that is connecting
        "delt-mt.delt.testnet", // name of contract you're connecting to
        {
          changeMethods: ["register", "ft_transfer"], // change methods modify state
          viewMethods: ["ft_balance_of", "ft_transfer_call"] // view methods do not change state but usually return a value
        }),
      register: async (account_id?) => {
        return await near.deltft.contract.register({ account_id }, "300000000000000", "1000000000000000000000000")
      },
      register_stake: async (amount) => {
        return await near.deltft.contract.ft_transfer({ amount, receiver_id: near.deltd.contract.account.accountId })
      },
      transfer: async (receiver_id, amount) => {
        return await near.deltft.contract.ft_transfer({ amount, receiver_id })
      }
    },
    deltmt: {
      bid: async (seller_id, token_id) => {
        return await near.deltft.contract.bid({ seller_id, token_id })
      },
      contract: new Contract(
        wallet.account(),
        "delt-mt.delt.testnet",
        {
          changeMethods: ["register", "mt_transfer", "mt_merge"],
          viewMethods: ["mt_token", "mt_for_owner", "balance", "merge_attrs", "mt_attrs", "mt_batch_attrs", "token_id_by_attrs", "create_listing", "bid", "purchase", "end_auction", "remove_listing", "get_listings", "mt_balance_of", "mt_batch_balance_of", "mt_transfer_call"]
        }),
      create_listing: async (
        token_id,
        price,
        amount,
        auction,
        approval,
        memo
      ) => {
        return await near.deltmt.contract.create_listing({
          amount,
          approval,
          auction,
          memo,
          price,
          token_id
        })
      },
      end_auction: async (seller_id, token_id) => {
        return await near.deltmt.contract.end_auction({ seller_id, token_id })
      },
      get_listings: async (token_id) => {
        return await near.deltmt.contract.get_listings({ token_id })
      },
      merge_attrs: async (attrs, new_attrs) => {
        return await near.deltmt.contract.merge_attrs({ attrs, new_attrs }, "300000000000000", "1000000000000000000000000")
      },
      mt_attrs: async (token_id) => {
        return await near.deltmt.contract.mt_attrs({ token_id })
      },
      mt_balance_of: async (account_id, token_id) => {
        return await near.deltmt.contract.mt_balance_of({ account_id, token_id })
      },
      mt_batch_attrs: async (token_ids) => {
        return await near.deltmt.contract.mt_batch_attrs({ token_ids })
      },
      mt_batch_balance_of: async (account_id, token_ids) => {
        return await near.deltmt.contract.mt_batch_balance_of({ account_id, token_ids })
      },
      mt_batch_supply: async (token_ids) => {
        return await near.deltmt.contract.mt_batch_supply({ token_ids })
      },
      mt_supply: async (token_id) => {
        return await near.deltmt.contract.mt_supply({ token_id })
      },
      mt_token: async (token_ids) => {
        return await near.deltmt.contract.mt_token({ token_ids }) as (Token | undefined)[]
      },
      mt_tokens_for_owner: async (account_id, from_index, limit) => {
        return await near.deltmt.contract.mt_tokens_for_owner({ account_id, from_index, limit })
      },
      purchase: async (seller_id, token_id) => {
        return await near.deltmt.contract.purchase({ seller_id, token_id })
      },
      register: async (account_id) => {
        return await near.deltmt.contract.register({ account_id }, "300000000000000", "1000000000000000000000000")
      },
      register_stake: async (token_id, amount) => {
        return await near.deltmt.contract.mt_transfer({ amount, receiver_id: near.deltd.contract.account.accountId, token_id }, "300000000000000", "1000000000000000000000000")
      },
      remove_listing: async (seller_id, token_id) => {
        return await near.deltmt.contract.remove_listing({ seller_id, token_id })
      },
      token_id_by_attrs: async (attrs) => {
        return await near.deltmt.contract.token_id_by_attrs({ attrs })
      },
      transfer: async (receiver_id, token_id, amount) => {
        return await near.deltmt.contract.mt_transfer({ amount, receiver_id, token_id }, "300000000000000", "1000000000000000000000000")
      }
    },
    utils,
    wallet
  }) as Client
  return {
    provide: {
      near
    }
  }
})

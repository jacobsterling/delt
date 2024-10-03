import { connect, Contract, keyStores, Near, WalletConnection } from "near-api-js"
import { Character } from "~~/types/contracts"

export const connection = async () => {
  const api: Near = await connect({
    headers: {},
    helperUrl: "https://helper.testnet.near.org",
    keyStore: new keyStores.BrowserLocalStorageKeyStore(),
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org"
  })

  return new WalletConnection(api, "delt")
}

const deltd = async (): Promise<Contract> => {

  const wallet = await connection()

  return new Contract(
    wallet.account(),
    "delt-d.delt.testnet",
    {
      changeMethods: ["register", "stake", "unstake", "create_pool"],
      viewMethods: ["get_character", "get_pools", "verify_stake"]
    })
}

export const get_character = async (account_id: string): Promise<Character> => {
  try {
    const { xp, attributes } = await deltd.get_character({ account_id })

    return { attributes: JSON.parse(attributes), xp } as Character
  } catch (e: any) {
    throw createError({ statusCode: 404, statusMessage: "Error fetching character", data: "account_id" })
  }
}
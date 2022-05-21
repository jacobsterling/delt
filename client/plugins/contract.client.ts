import { ethers, Signer, providers, Contract, ContractInterface } from "ethers"

import DeltItems from "../../defi/artifacts/contracts/DeltItems.sol/DeltItems.json"
import { Wallet } from "./wallet.client"

export interface Stat {
  statKey: string,
  value: number,
  desc: string,
  rarity: string
}
export interface Attr {
  attrKey: string,
  stats: Stat[],
}

export interface Item {
  id: number,
  attributes: JSON,
  tokenId: number,
  createdAt: number,
  description: string,
  owner: string,
  slug: string
}
export interface ContractRef {

  contract: Contract,
  updateSupabase: (tokenId: number, id: number, account: string) => void,
  burnItem: (wallet: Wallet, item: Item) => Promise<void>,
  read: (provider: providers.Web3Provider, contractAbi: ContractInterface) => Contract,
  connect: (signer: Signer, contractAbi: ContractInterface) => void,
  removeAttribute: (tokenId: string, attrKey: string) => Promise<void>,
  removeStat: (tokenId: string, attrKey: string, stat: Stat) => Promise<void>,
  setAttribute: (tokenId: string, attribute: Attr) => Promise<void>,
  setStat: (tokenId: string, attrKey: string, stat: Stat) => Promise<void>,
  getAddress: () => string,
  awardItem: (wallet: Wallet, item: Item, image: string) => Promise<any>,
  getURI: (tokenId: number) => Promise<string>,
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/upgradeProxy.ts --network localhost
  const contractRef = reactive<ContractRef>({

    awardItem: async (wallet: Wallet, item: Item, image: string) => {
      try {
        const newTokenId = await contractRef.contract.awardItem(wallet.account, item.slug, image, item.attributes)

        await newTokenId.wait()

        console.log(newTokenId.value.toNumber())

        await contractRef.updateSupabase(item.id, newTokenId.value.toNumber(), wallet.account)

        return true
      } catch (Error) {
        console.log(Error)
        return false
      }
    },

    burnItem: async (wallet: Wallet, item: Item) => {
      const tokenId = await contractRef.contract.getTokenId(item.slug)
      const result = await contractRef.contract.burn(tokenId)
      await result.wait()
      await contractRef.updateSupabase(item.id, null, wallet.account)
    },

    connect: (signer: Signer, contractAbi: ContractInterface = DeltItems.abi) => {
      const contract = markRaw(new ethers.Contract(contractRef.getAddress(), contractAbi, signer))
      contractRef.contract = contract.connect(signer)
    },

    contract: undefined,

    getAddress: () => {
      return "0x67d269191c92Caf3cD7723F116c85e6E9bf55933"
    },

    getURI: async (tokenId: number) => {
      const result = await contractRef.contract.tokenURI(tokenId)
      const URI = await result.wait()
      return URI
    },

    read: (provider: providers.Web3Provider, contractAbi: ContractInterface = DeltItems.abi) => {
      return markRaw(new ethers.Contract(contractRef.getAddress(), contractAbi, provider))
    },

    removeAttribute: async (tokenId: string, attrKey: string) => {
      const result = await contractRef.contract.removeAttribute(tokenId, attrKey)
      await result.wait()
    },

    removeStat: async (tokenId: string, attrKey: string, stat: Stat) => {
      const result = await contractRef.contract.removeStat(tokenId, attrKey, stat)
      await result.wait()
    },

    setAttribute: async (tokenId: string, attribute: Attr) => {
      const result = await contractRef.contract.setAttribute(tokenId, attribute)
      await result.wait()
    },

    setStat: async (tokenId: string, attrKey: string, stat: Stat) => {
      const result = await contractRef.contract.setAttribute(tokenId, attrKey, stat)
      await result.wait()
    },

    // updates metadataURI in supabase (should we use all metadata from store() ??
    updateSupabase: async (id: number, tokenId: number, owner: string) => {
      await useSupabaseClient()
        .from("items")
        .update({ owner, tokenId })
        .eq("id", id)
    }
  })
  return {
    provide: {
      contractRef
    }
  }
})

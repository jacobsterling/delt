import { ethers, Signer, providers, Contract, ContractInterface } from "ethers"

import DeltItems from "../../defi/artifacts/contracts/DeltItems.sol/DeltItems.json"
import DeltTrader from "../../defi/artifacts/contracts/DeltTrader.sol/DeltTrader.json"
import { Wallet } from "./wallet.client"

// export interface Token {

// } // JSON that we get back from contract
export interface Stat {
  desc: string,
  statKey: string,
  tier: number,
  value: number
}
export interface Attr {
  attrKey: string,
  stats: Stat[],
}
export interface ItemId {
  awarded: boolean,
  itemName: string,
  itemType: string,
  mod: number
}
export interface Item {
  id: number,
  attributes: Attr[],
  tokenId: number,
  createdAt: number,
  contract: string,
  description: string,
  owner: string,
  slug: string
  listed: boolean,
  auctioned: boolean,
  type: string,
  price: number
}

export interface ContractRef {
  burnItem: (wallet: Wallet, item: Item) => Promise<void>,
  convertAttr: (attribute: Attr) => Array<any>,
  convertAttrs: (attributes: Attr[]) => Array<any>,
  convertStats: (stats: Stat[]) => Array<any>,
  bid: (wallet: Wallet, item: Item, amount: number) => Promise<void>,
  endAuction: (wallet: Wallet, item: Item) => Promise<void>,
  purchase: (wallet: Wallet, item: Item) => Promise<void>,
  addListing: (wallet: Wallet, item: Item, price: number) => Promise<void>,
  read: (provider: providers.Web3Provider, contractAbi: ContractInterface, contractAddress: string) => Contract,
  removeListing: (wallet: Wallet, item: Item) => Promise<void>,
  readDeltItems: (provider: providers.Web3Provider) => Contract,
  readDeltTrader: (provider: providers.Web3Provider) => Contract,
  connectDeltItems: (signer: Signer) => Contract,
  connectDeltTrader: (signer: Signer) => Contract,
  withdraw: (wallet: Wallet, amount: number) => Promise<void>,
  modifiyItem: (wallet: Wallet, item: Item, upgrade: number, attribute: Attr) => Promise<void>,
  deltItemsAddress: () => string,
  deltTraderAddress: () => string,
  awardItem: (wallet: Wallet, item: Item, image: string) => Promise<any>,
  payToMintItem: (wallet: Wallet, item: Item, image: string) => Promise<any>
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/upgradeProxy.ts --network localhost
  const contractRef = reactive<ContractRef>({

    addListing: async (wallet: Wallet, item: Item, price: number) => {
      const DeltTrader = contractRef.connectDeltTrader(wallet.signer)
      const result = await DeltTrader.addListing(item.tokenId, price, item.auctioned)
      DeltTrader.on("AuctionStart", (contractAddr: string, _tokenId: any, price: any, endAt: any) => console.log("AuctionStart", contractAddr, _tokenId.toNumber(), price.toNumber(), endAt)
      )
      await result.wait()
      await useSupabaseClient()
        .from("items")
        .update({ auctioned: item.auctioned, listed: true, price })
        .eq("id", item.id)
    },

    awardItem: async (wallet: Wallet, item: Item, image: string) => {
      try {
        const attributes = contractRef.convertAttrs(item.attributes)

        const DeltItems = await contractRef.connectDeltItems(wallet.signer)

        const itemId: ItemId = {
          awarded: true,
          itemName: item.slug,
          itemType: item.type,
          mod: 0
        }

        const result = await DeltItems.awardItem(wallet.account, Object.values(itemId), image, attributes)

        await result.wait()

        const newTokenId = await DeltItems.getTokenId(itemId.itemName)

        console.log(newTokenId.toNumber())

        await useSupabaseClient()
          .from("items")
          .update({ owner: wallet.account, tokenId: newTokenId })
          .eq("id", item.id)

        return true
      } catch (Error) {
        console.log(Error)
        return false
      }
    },

    bid: async (wallet: Wallet, item: Item, amount: number) => {
      const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
      const result = await DeltTrader.bid(item.tokenId, {
        value: ethers.utils.parseEther(amount.toString())
      })
      DeltTrader.on("BidPlaced", (contractAddr: string, _tokenId: any, highestBid: any) => console.log("Bid Placed", contractAddr, _tokenId.toNumber(), highestBid.toNumber())
      )

      await result.wait()
      await useSupabaseClient()
        .from("items")
        .update({ price: amount })
        .eq("id", item.id)
    },

    burnItem: async (wallet: Wallet, item: Item) => {
      const DeltItems = await contractRef.connectDeltItems(wallet.signer)
      const result = await DeltItems.burn(item.tokenId)
      await result.wait()
      await useSupabaseClient()
        .from("items")
        .update({ owner: wallet.account, tokenId: null })
        .eq("id", item.id)
    },

    connectDeltItems: (signer: Signer) => {
      const contract = markRaw(new ethers.Contract(contractRef.deltItemsAddress(), DeltItems.abi, signer))
      return contract.connect(signer)
    },

    connectDeltTrader: (signer: Signer) => {
      const contract = markRaw(new ethers.Contract(contractRef.deltTraderAddress(), DeltTrader.abi, signer))
      return contract.connect(signer)
    },

    convertAttr: (attribute: Attr) => {
      attribute.stats = contractRef.convertStats(attribute.stats)
      return Object.values(attribute)
    },

    convertAttrs: (attributes: Attr[]) => {
      const _attributes = []
      for (let i = 0; i < attributes.length; i++) {
        _attributes.push(contractRef.convertAttr(attributes[i]))
      }
      return _attributes
    },

    convertStats: (stats: Stat[]) => {
      const _stats = []
      for (let i = 0; i < stats.length; i++) {
        _stats.push(Object.values(stats[i]))
      }
      return _stats
    },

    deltItemsAddress: () => {
      return "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
    },

    deltTraderAddress: () => {
      return "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
    },

    endAuction: async (wallet: Wallet, item: Item) => {
      const DeltTrader = await contractRef.connectDeltItems(wallet.signer)
      const result = await DeltTrader.endAuction(item.tokenId)
      await result.wait()
      await useSupabaseClient()
        .from("items")
        .update({ auction: false, listed: false, owner: result.value })
        .eq("id", item.id)
    },

    modifiyItem: async (wallet: Wallet, item: Item, upgrade: number, attribute: Attr) => {
      const DeltItems = await contractRef.connectDeltItems(wallet.signer)
      const Id = await DeltItems.getItemId(item.tokenId)
      console.log(Id.at(-1).toNumber())
      const price = await DeltItems.getOpMod(Id.at(-1).toNumber() + upgrade, upgrade)
      console.log(price / 1e18)
      console.log(contractRef.convertAttr(attribute))
      const result = await DeltItems.modifiyItem(item.tokenId, contractRef.convertAttr(attribute), {
        value: ethers.utils.parseUnits(price.toString(), "wei")
      })
      await result.wait()
    },

    payToMintItem: async (wallet: Wallet, item: Item, image: string) => {
      try {
        const attributes = contractRef.convertAttrs(item.attributes)

        const DeltItems = await contractRef.connectDeltItems(wallet.signer)

        const itemId: ItemId = {
          awarded: false,
          itemName: item.slug,
          itemType: item.type,
          mod: 0
        }

        const price = 0.001 * 9

        const result = await DeltItems.payToMintItem(wallet.account, Object.values(itemId), image, attributes, {
          value: ethers.utils.parseUnits(`${price}`, "ether")
        })
        await result.wait()

        const newTokenId = await DeltItems.getTokenId(itemId.itemName)

        await useSupabaseClient()
          .from("items")
          .update({ owner: wallet.account, tokenId: newTokenId.toNumber() })
          .eq("id", item.id)

        return true
      } catch (Error) {
        console.log(Error)
        return false
      }
    },

    purchase: async (wallet: Wallet, item: Item) => {
      const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
      const result = await DeltTrader.purchace(item.tokenId)
      await result.wait()
      await useSupabaseClient()
        .from("items")
        .update({ auction: false, listed: false, owner: result.value })
        .eq("id", item.id)
    },

    read: (provider: providers.Web3Provider, contractAbi: ContractInterface, contractAddress: string) => {
      return markRaw(new ethers.Contract(contractAddress, contractAbi, provider))
    },

    readDeltItems: (provider: providers.Web3Provider) => {
      return contractRef.read(provider, DeltItems.abi, contractRef.deltItemsAddress())
    },

    readDeltTrader: (provider: providers.Web3Provider) => {
      return contractRef.read(provider, DeltTrader.abi, contractRef.deltTraderAddress())
    },

    removeListing: async (wallet: Wallet, item: Item) => {
      const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
      const result = await DeltTrader.removeListing(item.tokenId)
      await result.wait()
      await useSupabaseClient()
        .from("items")
        .update({ auction: false, listed: false })
        .eq("id", item.id)
    },

    withdraw: async (wallet: Wallet, amount: number) => {
      const result = await contractRef.deltTrader.withdraw(amount, wallet.account)
      await result.wait()
    }

  })
  return {
    provide: {
      contractRef
    }
  }
})

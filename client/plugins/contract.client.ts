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
  deltItemsAddress: string,
  deltTraderAddress: string,
  setTier: (_desc: string, _tier: number) => Promise<void>,
  awardItem: (wallet: Wallet, item: Item, image: string) => Promise<number>,
  payToMintItem: (wallet: Wallet, item: Item, image: string) => Promise<number>
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/upgradeProxy.ts --network localhost
  const contractRef = reactive<ContractRef>({

    addListing: async (wallet: Wallet, item: Item, price: number) => {
      try {
        const DeltItems = contractRef.connectDeltItems(wallet.signer)
        if (!await DeltItems.isApprovedForAll(wallet.account, contractRef.deltTraderAddress)) {
          const approval = await DeltItems.setApprovalForAll(contractRef.deltTraderAddress, true)
          await approval.wait()
          console.log("DeltTrader approved for all.")
        }
        const DeltTrader = contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.addListing(item.tokenId, ethers.utils.parseEther(price.toString()), item.auctioned)
        DeltTrader.on("AuctionStart", (contractAddr: string, _tokenId: any, price: any, endAt: any) => console.log("AuctionStart", contractAddr, _tokenId.toNumber(), price.toNumber(), endAt)
        )
        await result.wait()
        const { error } = await useSupabaseClient()
          .from("items")
          .update({ auctioned: item.auctioned, listed: true, price })
          .eq("id", item.id)

        if (error) {
          throw new Error(error.message)
        }
      } catch (Error) {
        console.log(Error)
      }
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

        const { error } = await useSupabaseClient()
          .from("items")
          .update({ owner: wallet.account, tokenId: newTokenId.toNumber() })
          .eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }
        return newTokenId.toNumber()
      } catch (Error) {
        console.log(Error)
        return null
      }
    },

    bid: async (wallet: Wallet, item: Item, amount: number) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.bid(item.tokenId, {
          value: ethers.utils.parseEther(amount.toString())
        })
        DeltTrader.on("BidPlaced", (contractAddr: string, _tokenId: any, highestBid: any) => console.log("Bid Placed", contractAddr, _tokenId.toNumber(), highestBid.toNumber())
        )

        await result.wait()
        const { error } = await useSupabaseClient()
          .from("items")
          .update({ price: amount })
          .eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    burnItem: async (wallet: Wallet, item: Item) => {
      try {
        const DeltItems = await contractRef.connectDeltItems(wallet.signer)
        const result = await DeltItems.burn(item.tokenId)
        await result.wait()
        const { error } = await useSupabaseClient()
          .from("items")
          .update({ owner: wallet.account, tokenId: null })
          .eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    connectDeltItems: (signer: Signer) => {
      const contract = markRaw(new ethers.Contract(contractRef.deltItemsAddress, DeltItems.abi, signer))
      return contract.connect(signer)
    },

    connectDeltTrader: (signer: Signer) => {
      const contract = markRaw(new ethers.Contract(contractRef.deltTraderAddress, DeltTrader.abi, signer))
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

    deltItemsAddress: "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650",

    deltTraderAddress: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",

    endAuction: async (wallet: Wallet, item: Item) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.endAuction(item.tokenId)
        await result.wait()
        const transaction = DeltTrader.getListings(item.tokenId)
        const { error } = await useSupabaseClient()
          .from("items")
          .update({ auctioned: false, listed: false, owner: transaction[0] })
          .eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    modifiyItem: async (wallet: Wallet, item: Item, upgrade: number, attribute: Attr) => {
      try {
        const DeltItems = await contractRef.connectDeltItems(wallet.signer)
        const Id = await DeltItems.getItemId(item.tokenId)
        const price = await DeltItems.getOpMod(Id.at(-1).toNumber() + upgrade, upgrade)
        const result = await DeltItems.modifiyItem(item.tokenId, contractRef.convertAttr(attribute), {
          value: ethers.utils.parseUnits(price.toString(), "wei")
        })
        await result.wait()
        // update in supabase ??
      } catch (Error) {
        console.log(Error)
      }
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

        const newTokenId = await DeltItems.getTokenId(itemId.itemName)
        await result.wait()
        const { error } = await useSupabaseClient()
          .from("items")
          .update({ owner: wallet.account, tokenId: newTokenId.toNumber() })
          .eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }

        return newTokenId.toNumber()
      } catch (Error) {
        console.log(Error)
        return null
      }
    },

    purchase: async (wallet: Wallet, item: Item) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.purchace(item.tokenId, {
          value: ethers.utils.parseUnits(`${item.price}`, "ether")
        })
        await result.wait()
        const { error } = await useSupabaseClient()
          .from("items")
          .update({ auctioned: false, listed: false, owner: wallet.account })
          .eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    read: (provider: providers.Web3Provider, contractAbi: ContractInterface, contractAddress: string) => {
      return markRaw(new ethers.Contract(contractAddress, contractAbi, provider))
    },

    readDeltItems: (provider: providers.Web3Provider) => {
      return contractRef.read(provider, DeltItems.abi, contractRef.deltItemsAddress)
    },

    readDeltTrader: (provider: providers.Web3Provider) => {
      return contractRef.read(provider, DeltTrader.abi, contractRef.deltTraderAddress)
    },

    removeListing: async (wallet: Wallet, item: Item) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.removeListing(item.tokenId)
        await result.wait()
        const { error } = await useSupabaseClient()
          .from("items")
          .update({ auctioned: false, listed: false })
          .eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    setTier: async (trait: string, tier: number, desc: Object = {}) => {
      try {
        const result = await contractRef.deltItems.setTier(trait, tier)
        await result.wait()
        const { error } = await useSupabaseClient()
          .from("traits")
          .upsert({ desc, tier, trait })
        if (error) {
          throw new Error(error.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    withdraw: async (wallet: Wallet, amount: number) => {
      try {
        const result = await contractRef.deltTrader.withdraw(amount, wallet.account)
        await result.wait()
      } catch (Error) {
        console.log(Error)
      }
    }

  })
  return {
    provide: {
      contractRef
    }
  }
})

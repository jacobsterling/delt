import { ethers, Signer, providers, Contract, ContractInterface } from "ethers"

import DeltEntities from "../../defi/artifacts/contracts/DeltEntities.sol/DeltEntities.json"
import DeltItems from "../../defi/artifacts/contracts/DeltItems.sol/DeltItems.json"
import DeltTrader from "../../defi/artifacts/contracts/DeltTrader.sol/DeltTrader.json"
import { Wallet } from "./wallet.client"

// export interface Token {

// } // JSON that we get back from contract
export interface Stat {
  trait: string,
  statKey: string,
  tier: number,
  value: number
}
export interface Attr {
  attrKey: string,
  stats: Stat[],
}
export interface Id {
  amount: number,
  awarded: boolean,
  itemName: string,
  itemType: string,
  lvl: number
}
export interface Token {
  tokenId: number,
  upgradable: boolean,
  amount: number,
  mintedAt: number,
  owner: string,
  name: string,
  slug: string,
  type: string,
  level: number,
  attributes: Attr[]
  listed: boolean,
  auctioned: boolean
  price: number,
  initPrice: number,
  bids: {
    address: string,
    bid: number
  }[],
}

export interface Unminted {
  name: string,
  slug: string,
  type: string,
  upgradable: boolean,
  supply: number,
  attributes: Attr[],
  createdAt: Date,
  createdBy: string,
  burned: boolean
}
export interface Bid {
  address: string,
  bid: number
}

export interface ContractRef {
  burn: (wallet: Wallet, token: Token, amount: number) => Promise<void>,
  burnItem: (wallet: Wallet, token: Token) => Promise<void>,
  burnEntities: (wallet: Wallet, token: Token, amount: number) => Promise<void>,
  convertAttr: (attribute: Attr) => Array<any>,
  convertAttrs: (attributes: Attr[]) => Array<any>,
  convertStats: (stats: Stat[]) => Array<any>,
  bid: (wallet: Wallet, token: Token, amount: number) => Promise<void>,
  endAuction: (wallet: Wallet, token: Token) => Promise<void>,
  purchase: (wallet: Wallet, token: Token) => Promise<void>,
  addListing: (wallet: Wallet, token: Token, auction: boolean, price: number, amount: number) => Promise<void>,
  read: (provider: providers.Web3Provider, contractAbi: ContractInterface, contractAddress: string) => Contract,
  removeListing: (wallet: Wallet, token: Token) => Promise<void>,
  readDeltItems: (provider: providers.Web3Provider) => Contract,
  readDeltEntities: (provider: providers.Web3Provider) => Contract,
  readDeltTrader: (provider: providers.Web3Provider) => Contract,
  connectDeltItems: (signer: Signer) => Contract,
  connectDeltEntities: (signer: Signer) => Contract,
  connectDeltTrader: (signer: Signer) => Contract,
  tokenIteraction: (wallet: Wallet, upgradable: boolean) => Contract,
  tokenAddress: (upgradable: boolean) => string,
  withdraw: (wallet: Wallet, amount: number) => Promise<void>,
  modifiyItem: (wallet: Wallet, token: Token, upgrade: number, attribute: Attr) => Promise<void>,
  deltAddress: string,
  deltItemsAddress: string,
  deltEntitiesAddress: string,
  deltTraderAddress: string,
  setTier: (wallet: Wallet, trait: string, tier: number, upgradable: boolean, desc: Object) =>
    Promise<void>,
  supabaseTokentransfer: (token: Token, buyer: string, _amount: number) => Promise<void>,
  mint: (wallet: Wallet, token: Unminted, image: string) => Promise<number>,
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/upgradeProxy.ts --network localhost
  const contractRef = reactive<ContractRef>({

    addListing: async (wallet: Wallet, token: Token, auction: boolean, price: number, amount: number = 1) => {
      try {
        if (amount > token.amount) {
          throw new Error("listed amount exceeds number of tokens owned")
        }
        const contract = contractRef.tokenIteraction(wallet, token)
        if (!await contract.isApprovedForAll(wallet.account, contractRef.deltTraderAddress)) {
          const approval = await contract.setApprovalForAll(contractRef.deltTraderAddress, true)
          await approval.wait()
          console.log("DeltTrader approved for all.")
        }
        const DeltTrader = contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.addListing([contract.address, token.tokenId], ethers.utils.parseEther(price.toString()), amount, auction)
        DeltTrader.on("AuctionStart", (_listing: [], price: any, endAt: any) => { console.log("AuctionStart", _listing, price.toNumber(), endAt) }
        )
        const { error } = await useSupabaseClient()
          .from("tokens")
          .update({ auctioned: auction, initPrice: price, listed: true, price })
        if (error) {
          throw new Error(error.message)
        }
        await result.wait()
      } catch (Error) {
        console.log(Error)
      }
    },

    bid: async (wallet: Wallet, token: Token, amount: number) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.bid([contractRef.tokenAddress(token.upgradable), token.tokenId], {
          value: ethers.utils.parseEther(amount.toString())
        })
        DeltTrader.on("BidPlaced", async (contractAddr: string, _tokenId: any, updatedBids: Array<any>) => {
          console.log("BidPlaced", contractAddr, _tokenId.toNumber(), updatedBids)
          const bids: Bid[] = updatedBids.map((a, b) => <Bid>{
            address: a,
            bid: b / 10e18
          })
          console.log(bids)
          const { error } = await useSupabaseClient()
            .from("tokens")
            .update({
              bids,
              price: bids.at(-1).bid
            }).eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)
          if (error) {
            throw new Error(error.message)
          }
        }
        )
        await result.wait()
      } catch (Error) {
        console.log(Error)
      }
    },

    burn: async (wallet: Wallet, token: Token, amount: number) => {
      if (token.upgradable) {
        await contractRef.burnItem(wallet, token)
      } else {
        await contractRef.burnEntities(wallet, token, amount)
      }
    },

    burnEntities: async (wallet: Wallet, token: Token, amount: number) => {
      try {
        const DeltEntities = contractRef.connectDeltEntities(wallet.signer)
        const result = await DeltEntities.burn(wallet.account, token.tokenId, amount)
        await result.wait()
        if (token.amount === amount) {
          const { error: tokenError } = await useSupabaseClient()
            .from("tokens")
            .delete()
            .eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)
          if (tokenError) {
            throw new Error(tokenError.message)
          }
          const { error: readError, data } = await useSupabaseClient()
            .from("tokens")
            .select("*")
            .eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)
          if (readError) {
            throw new Error(readError.message)
          }
          if (!data) {
            const { error: unmintedError } = await useSupabaseClient()
              .from("unminted")
              .insert([{ attributes: token.attributes, burned: true, createdBy: wallet.account, name: token.name, slug: token.slug, supply: 0, type: token.type, upgradable: token.upgradable }])
            if (unmintedError) {
              throw new Error(unmintedError.message)
            }
          }
        } else {
          const { error: tokenError } = await useSupabaseClient()
            .from("tokens")
            .update({ amount: token.amount - amount })
            .eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)
          if (tokenError) {
            throw new Error(tokenError.message)
          }
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    burnItem: async (wallet: Wallet, token: Token) => {
      try {
        const contract = contractRef.connectDeltItems(wallet.signer)
        const result = await contract.burn(token.tokenId)
        await result.wait()
        const { error: tokenError } = await useSupabaseClient()
          .from("tokens")
          .delete()
          .eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)
        if (tokenError) {
          throw new Error(tokenError.message)
        }
        const { error: unmintedError } = await useSupabaseClient()
          .from("unminted")
          .insert([{ attributes: token.attributes, burned: true, createdBy: wallet.account, name: token.name, slug: token.slug, supply: 1, type: token.type, upgradable: token.upgradable }])
        if (unmintedError) {
          throw new Error(unmintedError.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    connectDeltEntities: (signer: Signer) => {
      const contract = new ethers.Contract(contractRef.deltEntitiesAddress, DeltEntities.abi, signer)
      return contract.connect(signer)
    },

    connectDeltItems: (signer: Signer) => {
      const contract = new ethers.Contract(contractRef.deltItemsAddress, DeltItems.abi, signer)
      return contract.connect(signer)
    },

    connectDeltTrader: (signer: Signer) => {
      const contract = new ethers.Contract(contractRef.deltTraderAddress, DeltTrader.abi, signer)
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

    deltAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",

    deltEntitiesAddress: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",

    deltItemsAddress: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",

    deltTraderAddress: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",

    endAuction: async (wallet: Wallet, token: Token) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.endAuction([contractRef.tokenAddress(token.upgradable), token.tokenId])
        await result.wait()
        DeltTrader.on("AuctionEnd", async (_listing: [], _highestBidder: string, _highestBid: number, _amount: number) => {
          console.log("AuctionEnd", _listing, _highestBidder, _highestBid, _amount)
          await contractRef.supabaseTokentransfer(token, _highestBidder, _amount)
        }
        )
      } catch (Error) {
        console.log(Error)
      }
    },

    mint: async (wallet: Wallet, token: Unminted, image: string) => {
      try {
        const attributes = contractRef.convertAttrs(token.attributes)

        const contract = contractRef.tokenIteraction(wallet, token.upgradable)

        const itemId: Id = {
          amount: token.supply,
          awarded: true,
          itemName: token.name,
          itemType: token.type,
          lvl: 0
        }

        if (wallet.profile.type === "admin") {
          const result = await contract.mint(wallet.account, Object.values(itemId), image, attributes)
          await result.wait()
        } else {
          let price: number = 0
          token.attributes.forEach((attr) => {
            attr.stats.forEach((stat) => { price += (stat.value * stat.tier) ^ 2 }
            )
          }
          )
          console.log(price * 0.001)
          const result = await contract.payToMint(wallet.account, Object.values(itemId), image, attributes, {
            value: ethers.utils.parseUnits(`${price * 0.001}`, "ether")
          })
          await result.wait()
        }

        const newTokenId = await contract.getTokenId(itemId.itemName)

        console.log(newTokenId.toNumber())

        const { error } = await useSupabaseClient()
          .from("tokens")
          .insert([{ amount: token.supply, attributes: token.attributes, name: token.name, owner: wallet.account, slug: useSlug(token.name), tokenId: newTokenId.toNumber(), type: token.type, upgradable: token.upgradable }])
        if (error) {
          throw new Error(error.message)
        }
        const { error: deleteError } = await useSupabaseClient()
          .from("unminted")
          .delete().eq("name", token.name)
        if (deleteError) {
          throw new Error(deleteError.message)
        }
        return newTokenId.toNumber()
      } catch (Error) {
        console.log(Error)
        return null
      }
    },

    modifiyItem: async (wallet: Wallet, token: Token, upgrade: number, attribute: Attr) => {
      try {
        const DeltItems = await contractRef.connectDeltItems(wallet.signer)
        const Id = await DeltItems.getItemId(token.tokenId)
        const price = await DeltItems.getOpPrice(Id.at(-1).toNumber() + upgrade, upgrade)
        const result = await DeltItems.modifiyItem(token.tokenId, contractRef.convertAttr(attribute), {
          value: ethers.utils.parseUnits(price.toString(), "wei")
        })
        await result.wait()
        // update in supabase ??
      } catch (Error) {
        console.log(Error)
      }
    },

    purchase: async (wallet: Wallet, token: Token) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.purchace([contractRef.tokenAddress(token.upgradable), token.tokenId], {
          value: ethers.utils.parseUnits(`${token.price}`, "ether")
        })
        await result.wait()

        DeltTrader.on("Purchaced", async (_listing: [], buyer: string, price: number, _amount: number) => {
          console.log(_listing, buyer, price, _amount)
          await contractRef.supabaseTokentransfer(token, buyer, _amount)
        })
      } catch (Error) {
        console.log(Error)
      }
    },

    read: (provider: providers.Web3Provider, contractAbi: ContractInterface, contractAddress: string) => {
      return markRaw(new ethers.Contract(contractAddress, contractAbi, provider))
    },

    readDeltEntities: (provider: providers.Web3Provider) => {
      return contractRef.read(provider, DeltEntities.abi, contractRef.deltEntitiesAddress)
    },
    readDeltItems: (provider: providers.Web3Provider) => {
      return contractRef.read(provider, DeltItems.abi, contractRef.deltItemsAddress)
    },

    readDeltTrader: (provider: providers.Web3Provider) => {
      return contractRef.read(provider, DeltTrader.abi, contractRef.deltTraderAddress)
    },

    removeListing: async (wallet: Wallet, token: Token) => {
      try {
        const DeltTrader = await contractRef.connectDeltTrader(wallet.signer)
        const result = await DeltTrader.removeListing([contractRef.tokenAddress(token.upgradable), token.tokenId])
        await result.wait()
        const { error: listingError } = await useSupabaseClient()
          .from("tokens")
          .update({ listed: false })
          .eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)

        if (listingError) {
          throw new Error(listingError.message)
        }
      } catch (Error) {
        console.log(Error)
      }
    },

    setTier: async (wallet: Wallet, trait: string, tier: number, upgradable: boolean, desc: Object = {}) => {
      try {
        const contract = contractRef.tokenIteraction(wallet.signer, upgradable)
        const result = await contract.setTier(trait, tier)
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

    supabaseTokentransfer: async (token: Token, buyer: string, _amount: number = 1) => {
      const { data: tokenData } = await useSupabaseClient()
        .from("tokens").select("*").eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner).single()
      if (!tokenData) {
        throw new Error("token belonging to seller does not exist in database")
      }
      if (tokenData.amount === _amount) {
        const { error: deleteError } = await useSupabaseClient()
          .from("tokens").delete().eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)
        if (deleteError) {
          throw new Error(deleteError.message)
        }
      } else {
        const { error: sellerError } = await useSupabaseClient()
          .from("tokens")
          .update({ amount: tokenData.amount - _amount, auctioned: false, listed: false })
          .eq("tokenId", token.tokenId).eq("upgradable", token.upgradable).eq("owner", token.owner)
        if (sellerError) {
          throw new Error(sellerError.message)
        }
      }
      const { data: buyerTokenData } = await useSupabaseClient()
        .from("tokens")
        .select("*")
        .eq("tokenId", token.tokenId)
        .eq("upgradable", token.upgradable)
        .eq("owner", buyer)
        .single()
      if (buyerTokenData) {
        tokenData.amount = buyerTokenData.amount + _amount
      } else {
        tokenData.amount = _amount
      }
      tokenData.owner = buyer
      const { error: buyerError } = await useSupabaseClient()
        .from("tokens").upsert(tokenData)
      if (buyerError) {
        throw new Error(buyerError.message)
      }
    },

    tokenAddress: (upgradable: boolean) => {
      if (upgradable) {
        return contractRef.deltItemsAddress
      } else {
        return contractRef.deltEntitiesAddress
      }
    },

    tokenIteraction: (wallet: Wallet, upgradable: boolean) => {
      if (upgradable) {
        return contractRef.connectDeltItems(wallet.signer)
      } else {
        return contractRef.connectDeltEntities(wallet.signer)
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

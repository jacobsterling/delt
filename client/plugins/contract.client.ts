import { Signer } from "ethers"
import { NFTStorage } from "nft.storage"

import { getProxy, proxyAddress } from "../../defi/scripts/getProxy"
import { Wallet } from "./wallet.client"

export interface ContractRef {
  item: {
    id: number,
    tokenId: number,
    createdAt: number,
    description: string,
    owner: string,
    slug: string,
  },
  store: (image: Blob, item: Object, wallet: Wallet) => void,
  updateSupabase: (tokenId: number, id: number, wallet: Wallet) => void,
  initContract: (signer: any) => any,
  getContractAddress: () => string,
  awardItem: (wallet: Wallet, item: Object, image: Blob) => Promise<any>,
  getURI: (tokenId: number) => Promise<string>,
  // safeMint: () => Promise<void>
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/deploy.ts --network ropsten
  // wallet: Wallet, item: Object, image: Blob
  const { NFT_STORAGE_KEY } = useRuntimeConfig()
  const contractRef = reactive<ContractRef>({
    // description used on ipfs (maybe add created by username ??)

    // mints the item, brings together all the functions
    awardItem: async (wallet: Wallet, item: typeof contractRef.item, image: Blob) => {
      const tokenURI = ref<string>(undefined)
      try { if (item.tokenId) { tokenURI.value = await contractRef.getURI(item.tokenId) } } catch { }

      if (!tokenURI.value && !item.tokenId) {
        // const contract = await contractRef.initContract(wallet.signer)
        // const contract = new ethers.Contract(contractRef.getContractAddress(), DeltItems.abi, wallet.provider)
        // const contract = await getProxy(ethers, wallet.signer)
        // const connection = contract.connect(wallet.signer)

        tokenURI.value = await contractRef.store(image, item, wallet)

        const result = await connection.awardItem(wallet.account, item.slug, item.attributes, tokenURI.value)

        const newItemId = await result.wait()

        await contractRef.updateSupabase(newItemId, true, item.id, wallet)

        return true
      } else { return false }
    },
    // "0x066676897391d185058c8cFF87B0734368BD44B9",

    // creates new contract object (doesnt work server side ??)
    getContractAddress: () => { return "0x066676897391d185058c8cFF87B0734368BD44B9" },

    getURI: async (tokenId: number) => {
      return await contractRef.contract.tokenURI(tokenId)
    },

    initContract: () => async (signer: any) => {
      const proxy = await import("../../defi/scripts/getProxy.ts")
      console.log(proxy)
      return markRaw(await proxy.getProxy(signer))
    },

    // get URI from contract

    // supabase item object
    item: undefined,

    // stores the image on the ipfs with tokenId/slug and fixed description
    // gives metadataURI that is used in the contract (may or maynot be correct)
    store: async (image: Blob, item: typeof contractRef.item, wallet: Wallet) => {
      const { username, accountCompact } = await useAccount(wallet.account)
      const api = new NFTStorage({ token: NFT_STORAGE_KEY })
      const metadata = await api.store({
        description: item.description,
        image,
        name: item.slug,
        properties: {
          minBy: { account: item.owner, username: username || accountCompact },
          origin: `https://delt/${username}/${item.slug}`,
          type: "NFT"
        }
      })

      return metadata.url.replace(/^ipfs:\/\//, "")
      // const metadataURI = ref<string>(`${NFT_STORAGE_KEY}/${tokenID}.json`)
      // const imageURI = ref<string>(`ipfs://${NFT_STORAGE_KEY}/${tokenId}.png`)
    },

    // updates metadataURI in supabase (should we use all metadata from store() ??
    updateSupabase: async (tokenId: number, id: number, wallet: Wallet) => {
      await useSupabaseClient()
        .from("items")
        .update({ owner: wallet.account, tokenId })
        .eq("id", id)
    }
  })
  return {
    provide: {
      contractRef
    }
  }
})

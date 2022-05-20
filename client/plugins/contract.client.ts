import { ethers, Signer, Contract, ContractInterface } from "ethers"
import { NFTStorage } from "nft.storage"

import DeltItems from "../../defi/artifacts/contracts/DeltItems.sol/DeltItems.json"
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
  contract: Contract,
  store: (image: Blob, item: Object, account: string) => void,
  updateSupabase: (tokenId: number, id: number, account: string) => void,
  initContract: (signer: Signer, contractAbi: ContractInterface) => void,
  getContractAddress: () => string,
  getAttributes: (tokenId: number) => Promise<any>,
  awardItem: (wallet: Wallet, item: Object, image: string) => Promise<any>,
  getURI: (tokenId: number) => Promise<string>,
  // safeMint: () => Promise<void>
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/upgradeProxy.ts --network localhost
  // wallet: Wallet, item: Object, image: Blob
  const { NFT_STORAGE_KEY } = useRuntimeConfig()
  const contractRef = reactive<ContractRef>({
    // description used on ipfs (maybe add created by username ??)

    // mints the item, brings together all the functions
    awardItem: async (wallet: Wallet, item: typeof contractRef.item, image: string) => {
      const tokenURI = ref<string>(undefined)
      try { if (item.tokenId) { tokenURI.value = await contractRef.getURI(item.tokenId) } } catch { }

      if (!tokenURI.value && !item.tokenId) {
        // tokenURI.value = await contractRef.store(image, item, wallet.account)

        const result = await contractRef.contract.awardItem(wallet.account, item.slug, item.attributes, image)

        const newTokenId = await result.wait()

        await contractRef.updateSupabase(newTokenId, item.id, wallet.account)

        return true
      } else { return false }
    },
    // "0x066676897391d185058c8cFF87B0734368BD44B9",

    contract: undefined,

    getAttributes: async (tokenId: number) => {
      const result = await contractRef.contract.getAttributes(tokenId)
      return result
    },

    // creates new contract object (doesnt work server side ??)
    getContractAddress: () => {
      return "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    }, // "" },0xf0c8941ad3c227bcd6f31321ce50693e7a75af8a

    getURI: async (tokenId: number) => {
      const result = await contractRef.contract.tokenURI(tokenId)
      const URI = await result.wait()
      return URI
    },

    initContract: (signer: Signer, contractAbi: ContractInterface = DeltItems.abi) => {
      const contract = markRaw(new ethers.Contract(contractRef.getContractAddress(), contractAbi, signer))
      contractRef.contract = contract.connect(signer)
    },

    // supabase item object
    item: undefined,

    // stores the image on the ipfs with tokenId/slug and fixed description
    // gives metadataURI that is used in the contract (may or maynot be correct)
    store: async (image: Blob, item: typeof contractRef.item, account: string) => {
      const { username, accountCompact } = await useAccount(account)
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
    updateSupabase: async (tokenId: number, id: number, owner: string) => {
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

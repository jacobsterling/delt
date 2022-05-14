import { ContractInterface, ethers } from "ethers"
import { NFTStorage } from "nft.storage"

import Delt from "../../defi/artifacts/contracts/delt.sol/Delt.json"
import { Wallet } from "./wallet.client"
export interface ContractRef {
  item: {
    id: number,
    tokenId: number,
    createdAt: number,
    description: string,
    owner: string,
    slug: string,
    published: boolean,
  },
  description?: string
  contract: ethers.Contract
  contractInterface: ContractInterface,
  contractAddress: string,
  deployContract: (wallet: Wallet) => void,
  store: (image: Blob, item: Object, wallet: Wallet) => void,
  updateSupabase: (tokenId: number, id: number, wallet: Wallet) => void,
  getMintedStatus: (metadata: string, wallet: Wallet) => Promise<Boolean>,
  getContractAddress: () => string,
  payToMint: (wallet: Wallet, item: Object, image: Blob) => Promise<any>,
  getURI: (tokenId: number) => Promise<string>,
  // safeMint: () => Promise<void>
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/deploy.ts --network ropsten
  // wallet: Wallet, item: Object, image: Blob
  const { NFT_STORAGE_KEY } = useRuntimeConfig()
  const contractRef = reactive<ContractRef>({
    contract: undefined,
    contractAddress: "0x9abD298a857531658729dDd4568C26f86bBfDc6B",
    contractInterface: Delt.abi,

    // creates new contract object (doesnt work server side ??)
    deployContract: (wallet: Wallet) => {
      contractRef.contract = markRaw(new ethers.Contract(contractRef.contractAddress, contractRef.contractInterface, wallet.signer))
    },
    // description used on ipfs (maybe add created by username ??)

    getContractAddress: () => { return contractRef.contractAddress },

    // supabase item object
    item: undefined,

    // get minted status from passed URI, assumes contract is deployed
    getMintedStatus: async (metadataURI: string, wallet: Wallet) => {
      if (!metadataURI) { return false }
      if (!contractRef.contract) { contractRef.deployContract(wallet) }
      return await contractRef.contract.isContentOwned(metadataURI) as Boolean
    },

    // get URI from contract
    getURI: async (tokenId: number) => {
      return await contractRef.contract.tokenURI(tokenId)
    },

    // mints the item, brings together all the functions
    payToMint: async (wallet: Wallet, item: typeof contractRef.item, image: Blob) => {
      contractRef.deployContract(wallet)

      const metadataURI = ref<string>(undefined)
      try { if (item.tokenId) { metadataURI.value = await contractRef.getURI(item.tokenId) } } catch { }

      if (!metadataURI.value && !item.tokenId) {
        const connection = contractRef.contract.connect(wallet.signer)

        metadataURI.value = await contractRef.store(image, item, wallet)

        const result = await contractRef.contract.payToMint(connection.address, metadataURI.value, {
          value: ethers.utils.parseEther("0.001")
        })

        const newItemId = await result.wait()

        await contractRef.updateSupabase(newItemId, true, item.id, wallet)

        return true
      } else { return false }
    },

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

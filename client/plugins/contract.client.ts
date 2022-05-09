import { ContractInterface, ethers } from "ethers"
import { NFTStorage } from "nft.storage"

import Delt from "../../defi/artifacts/contracts/delt.sol/Delt.json"
import { Wallet } from "./wallet.client"
export interface ContractRef {
  design: {
    id: number,
    created_at: number,
    created_by: string,
    owned_by: string,
    slug: string,
    published: boolean,
    metadata: string,
    metadataURI: string
  },
  tokenId: string,
  metadataURI?: string,
  // metadata?: Object,
  image: Blob,
  description?: string
  contract: ethers.Contract
  contractInterface: ContractInterface,
  contractAddress: string,
  deployContract: (wallet: Wallet) => void,
  store: () => void,
  updateMetadata: () => void,
  getMintedStatus: (metadata: string) => Promise<Boolean>,
  payToMint: (wallet: Wallet, design: Object, image: Blob) => Promise<any>,
  getURI: () => Promise<string>,
  // safeMint: () => Promise<void>
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/deploy.ts --network matic
  // wallet: Wallet, design: Object, image: Blob
  const { CONTRACT_ADDRESS, NFT_STORAGE_KEY } = useRuntimeConfig()
  const contractRef = reactive<ContractRef>({
    contract: undefined,
    contractAddress: CONTRACT_ADDRESS,
    contractInterface: Delt.abi,

    // creates new contract object (doesnt work server side ??)
    deployContract: (wallet: Wallet) => {
      contractRef.contract = markRaw(new ethers.Contract(contractRef.contractAddress, contractRef.contractInterface, wallet.signer))
    },
    // description used on ipfs (maybe add created by username ??)
    description: "DELT NFT Design",
    // supabase design object
    design: undefined,

    // get minted status from passed URI, assumes contract is deployed
    getMintedStatus: async (metadataURI: string) => {
      return await contractRef.contract.isContentOwned(metadataURI) as Boolean
    },

    // get URI from contract
    getURI: async () => {
      return await contractRef.contract.tokenURI()
    },

    image: undefined,
    metadataURI: undefined,

    // mints the design, brings together all the functions
    payToMint: async (wallet: Wallet, design: typeof contractRef.design, image: Blob) => {
      contractRef.deployContract(wallet)

      contractRef.tokenId = design.slug

      contractRef.metadataURI = design.metadataURI

      contractRef.image = markRaw(image)

      const mintResult = ref<any>(false)

      if (contractRef.metadataURI) {
        if (contractRef.getMintedStatus(contractRef.metadataURI)) {
          mintResult.value = true
        }
      }

      if (!mintResult.value) {
        const connection = contractRef.contract.connect(wallet.signer)

        await contractRef.store()
        await contractRef.updateMetadata()

        const result = await contractRef.contract.payToMint(connection.address, contractRef.metadataURI, {
          value: ethers.utils.parseEther("0.0001")
        })

        console.log(result)
        await result.wait()

        mintResult.value = result
      } else {
        mintResult.value = "Assumed to be already minted"
      }
      return mintResult.value
    },

    // stores the image on the ipfs with tokenId/slug and fixed description
    // gives metadataURI that is used in the contract (may or maynot be correct)
    store: async () => {
      console.log(NFT_STORAGE_KEY)
      const api = new NFTStorage({ token: NFT_STORAGE_KEY })
      if (contractRef.tokenId) {
        const metadata = await api.store({
          description: contractRef.description,
          image: contractRef.image,
          name: contractRef.tokenId
        })
        contractRef.metadataURI = metadata.url.replace(/^ipfs:\/\//, "")
        // const metadataURI = ref<string>(`${NFT_STORAGE_KEY}/${tokenID}.json`)
        // const imageURI = ref<string>(`ipfs://${NFT_STORAGE_KEY}/${tokenId}.png`)
      }
    },

    // NFT name, would like to be equal to design slug but idk how naming convention works
    tokenId: undefined,

    // updates metadataURI in supabase (should we use all metadata from store() ??
    updateMetadata: async () => {
      if (contractRef.metadataURI) {
        await useSupabaseClient()
          .from("designs")
          .update({ metadataURI: contractRef.metadataURI })
          .eq("slug", contractRef.tokenId)
      }
    }
  })
  return {
    provide: {
      contractRef
    }
  }
})

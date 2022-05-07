import { ContractInterface, ethers } from "ethers"
import { NFTStorage } from "nft.storage"
import { Wallet } from "wallet.client"

import Delt from "../../defi/artifacts/contracts/delt.sol/Delt.json"

export interface ContractRef {
  design: object,
  tokenId: string,
  metadataURI?: string,
  // metadata?: Object,
  image: Blob,
  description?: string
  contract: ethers.Contract
  contractInterface: ContractInterface,
  contractAddress: string,
  NFT_STORAGE_KEY: string,
  deployContract: (wallet: Wallet) => void,
  store: () => void,
  updateMetadata: () => void,
  getMintedStatus: (metadata: string) => Promise<Boolean>,
  payToMint: (wallet: Wallet, design: Object, image: Blob) => Promise<any>,
  getURI: () => Promise<string>,
  // safeMint: () => Promise<void>
}

export default defineNuxtPlugin(() => {
  // npx hardhat run scripts/deploy.ts --network localhost
  // wallet: Wallet, design: Object, image: Blob
  const contractRef = reactive<ContractRef>({
    NFT_STORAGE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGVjOTlmZTc3NzE5OGY5MDZGNTk1OWNCYWIwMzNmMThEMEVEMzQ2RkUiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1MTUwMDI2NTc1MCwibmFtZSI6ImRlbHQifQ.TmVhxJwnYJHi2eijCDdg7tYYXo9lPG0dI62usKyW8Pg",
    contract: undefined,
    contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    contractInterface: Delt.abi,

    // creates new contract object (doesnt work server side ??)
    deployContract: (wallet: Wallet) => {
      contractRef.contract = new ethers.Contract(contractRef.contractAddress, contractRef.contractInterface, wallet.signer)
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
    payToMint: async (wallet: Wallet, design: Object, image: Blob) => {
      contractRef.deployContract(wallet)

      contractRef.tokenId = design.slug

      contractRef.metadataURI = design.metadataURI

      contractRef.image = image

      const mintResult = ref<any>(undefined)

      if (!contractRef.getMintedStatus(contractRef.metadataURI)) {
        const connection = contractRef.contract.connect(wallet.signer)

        contractRef.store()
        contractRef.updateMetadata()

        const result = await contractRef.contract.payToMint(connection.address, contractRef.metadataURI, {
          value: ethers.utils.parseEther("0.05")
        })

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
      const api = new NFTStorage({ token: contractRef.NFT_STORAGE_KEY })
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
})

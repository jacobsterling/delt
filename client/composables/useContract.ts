import { ethers, Signer } from "ethers"
import { NFTStorage, Token, TokenType } from "nft.storage"

import Delt from "../../defi/artifacts/contracts/delt.sol/Delt.json"
import { Wallet } from "../plugins/wallet.client"

// type Provider = providers.Provider
// type Token = TokenType<typeof Token>
export interface Design {
  slug: string
  metadata?: {
    url: string
  }

}

export const useContract = (wallet: Wallet, design: Design, image: Blob) => {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  const NFT_STORAGE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGVjOTlmZTc3NzE5OGY5MDZGNTk1OWNCYWIwMzNmMThEMEVEMzQ2RkUiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1MTUwMDI2NTc1MCwibmFtZSI6ImRlbHQifQ.TmVhxJwnYJHi2eijCDdg7tYYXo9lPG0dI62usKyW8Pg"

  const metadataURI = ref<Object>(design.metadata)
  const isMinted = ref<boolean>(false)

  const getMintedStatus = async (metadata: string) => {
    const result = await contract.isContentOwned(metadata)
    isMinted.value = result
  }

  const description = ref<string>("DELT NFT Design")

  if (metadataURI.value) {
    if (getMintedStatus(design.metadata.url)) {
      return {
        mintStatus: isMinted.value,
        tokenURI: metadataURI.value
      }
    }
  }

  const store = async () => {
    const metadata = await api.store({
      description: description.value,
      image,
      name: design.slug
    })

    // const metadataURI = ref<string>(`${NFT_STORAGE_KEY}/${tokenID}.json`)

    // const imageURI = ref<string>(`ipfs://${NFT_STORAGE_KEY}/${tokenId}.png`)

    await useSupabaseClient()
      .from("designs")
      .update({ metadata })
      .eq("slug", design.slug)

    return metadata.url.replace(/^ipfs:\/\//, "")
  }

  // const provider = ref<Provider>(wallet.provider)
  const signer = ref<Signer>(wallet.provider.getSigner())
  const contract = new ethers.Contract(contractAddress, Delt.abi, signer.value)

  const tokenURI = ref<string>(undefined)

  const getURI = async () => {
    const uri = await contract.tokenURI()
    tokenURI.value = uri
  }

  const api = new NFTStorage({ token: NFT_STORAGE_KEY })

  const mintToken = async () => {
    const connection = contract.connect(signer.value)
    const address = connection.address

    metadataURI.value = await store()

    const result = await contract.payToMint(address, metadataURI.value, {
      value: ethers.utils.parseEther("0.05")
    })

    await result.wait()
    getMintedStatus(metadataURI.value)
  }

  mintToken()
  getURI()
  console.log("Minted !")
  console.log(metadataURI.value)
  console.log(tokenURI.value)

  return {
    mintStatus: isMinted.value,
    tokenURI: metadataURI.value
  }
}

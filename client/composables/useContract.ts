import { ethers, Signer, providers } from 'ethers';

import { Wallet } from "../plugins/wallet.client"

import Delt from "../../../defi/artifacts/contracts/delt.sol/Delt.json"

import { NFTStorage } from "nft.storage"


type Provider = providers.Provider

export const useUser = async (wallet: Wallet, tokenId: string) => {

  const client = useSupabaseClient()

  const { data: design } = await client.from("designs").select("*").eq("slug", tokenId).single()

  const { data, error } = await client
    .storage
    .from('designs')
    .download(`designs/${tokenId}`)

  const description = ref<string>("DELT NFT Design")
  const image = ref(design.image)

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  const NFT_STORAGE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGVjOTlmZTc3NzE5OGY5MDZGNTk1OWNCYWIwMzNmMThEMEVEMzQ2RkUiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1MTUwMDI2NTc1MCwibmFtZSI6ImRlbHQifQ.TmVhxJwnYJHi2eijCDdg7tYYXo9lPG0dI62usKyW8Pg"

  const provider = ref<Provider>(wallet.provider)
  const signer = ref<Signer>(wallet.provider.getSigner())

  const contract = new ethers.Contract(contractAddress, Delt.abi, signer.value)

  const isMinted = ref<boolean>(false)
  const uri = ref<string>(undefined)

  const getMintedStatus = async () => {
    const result = await contract.isContentOwned(metadataURI);
    isMinted.value = result
  }

  const getURI = async () => {
    const uri = await contract.tokenURI()
    uri.value = uri
  }

  const imageURI = ref<string>(`ipfs://${NFT_STORAGE_KEY}/${tokenId}.png`)

  const api = new NFTStorage({ token: NFT_STORAGE_KEY });

  const metadata = await api.store({
    name: tokenId,
    description: description.value,
    image: image.value,
  });

  const metadataURI = metadata.url.replace(/^ipfs:\/\//, "");

  // const metadataURI = ref<string>(`${NFT_STORAGE_KEY}/${tokenID}.json`)

  // href.replace(/^ipfs:\/\//, "");

  const mintToken = async () => {
    const connection = contract.connect(signer.value)
    const address = connection.address

    const result = await contract.payToMint(address, metadataURI, {
      value: ethers.utils.parseEther("0.05"),
    })

    await result.wait()
    getMintedStatus();
  }

  if (getMintedStatus) {
    mintToken()

  } else {
    mintToken()
  }
  getURI()

  return {
    mintStatus: isMinted.value,
    tokenURI: uri.value
  }
}
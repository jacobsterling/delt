import { ethers } from "ethers"

type Web3ProviderConstructorParameters = ConstructorParameters<typeof ethers.providers.Web3Provider>

declare global {
  interface Window {
    ethereum?: Web3ProviderConstructorParameters[0];
  }
}

export {}

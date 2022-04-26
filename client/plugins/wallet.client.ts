import MetaMaskOnboarding from "@metamask/onboarding"
import { ethers } from "ethers"
interface Wallet {
  account?: string,
  accountCompact?: string,
  balance?: string,
  connect: () => Promise<void>,
  getHexChainId: () => string,
  init: () => Promise<void>,
  network?: ReturnType<typeof ethers.providers.getNetwork>,
  provider?: ethers.providers.Web3Provider,
  setAccount: (account?: string) => Promise<void>,
  switchNetwork: (config: { chainId: number }) => Promise<void>
}

export default defineNuxtPlugin(() => {
  const wallet = reactive<Wallet>({
    account: undefined,
    accountCompact: undefined,
    balance: undefined,
    connect: async () => {
      if (MetaMaskOnboarding.isMetaMaskInstalled() === false) {
        new MetaMaskOnboarding().startOnboarding()
        return
      }

      wallet.network = await wallet.provider.getNetwork()
      const [account]: string = await wallet.provider.send("eth_requestAccounts", [])

      if (account !== undefined) {
        await wallet.setAccount(account)
      }
    },
    getHexChainId: () => {
      const hexChainId: string = `0x${wallet.network?.chainId.toString(16)}`
      return hexChainId
    },
    init: async () => {
      if (window.ethereum === undefined) { return }

      wallet.provider = markRaw(new ethers.providers.Web3Provider(window.ethereum))
      wallet.network = await wallet.provider.getNetwork()

      const [account] = await wallet.provider.listAccounts()

      if (account !== undefined) {
        wallet.setAccount(account)
      }
    },
    network: undefined,
    provider: undefined,
    setAccount: async (account?: string) => {
      if (account === undefined) {
        wallet.account = undefined
        wallet.accountCompact = undefined
        wallet.balance = undefined
        return
      }

      wallet.account = account
      wallet.accountCompact = `${wallet.account.substring(0, 4)}...${wallet.account.substring(wallet.account.length - 4)}`

      const balance = await wallet.provider?.getBalance(wallet.account)
      wallet.balance = ethers.utils.formatEther(balance)
    },
    switchNetwork: async (config: { chainId: number }) => {
      if (wallet.network?.chainId === config.chainId) { return }

      try {
        await wallet.provider?.send("wallet_switchEthereumChain", [config])
      } catch (error) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (error.code === 4902) {
          await wallet.provider?.send("wallet_addEthereumChain", [config])
        } else {
          throw error
        }
      }
    }
  })

  if (window.ethereum) {
    const web3Provider = window.ethereum as unknown as ethers.providers.Web3Provider

    web3Provider.on("accountsChanged", ([newAccount]: [string]) => {
      wallet.setAccount(newAccount)
    })

    web3Provider.on("chainChanged", () => {
      window.location.reload()
    })

    wallet.init()
  }

  return {
    provide: {
      wallet
    }
  }
})

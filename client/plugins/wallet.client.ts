import MetaMaskOnboarding from "@metamask/onboarding"
import { ethers } from "ethers"

export interface Profile {
  imageURL?: Object,
  level: number,
  type: string,
  username: string,
  userSlug: string
}
export interface Wallet {
  account?: string,
  accountCompact?: string,
  balance?: string,
  connect: () => Promise<void>,
  getHexChainId: () => string,
  init: () => Promise<void>,
  network?: ReturnType<typeof ethers.providers.getNetwork>,
  provider?: ethers.providers.Web3Provider, // | ethers.providers.AlchemyProvider,
  signer?: ethers.Signer,
  setAccount: (account?: string) => Promise<void>,
  switchNetwork: (config: { chainId: string }) => Promise<void>
  profile: Profile
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

      wallet.switchNetwork({ chainId: "0x3" })

      wallet.provider = markRaw(new ethers.providers.Web3Provider(window.ethereum))
      // wallet.provider = markRaw(new ethers.providers.AlchemyProvider("ropsten", API_KEY))
      wallet.signer = wallet.provider.getSigner()
      wallet.network = await wallet.provider.getNetwork()

      const [account] = await wallet.provider.listAccounts()

      if (account !== undefined) {
        wallet.setAccount(account)
      }
    },
    network: undefined,
    profile: undefined,
    provider: undefined,

    setAccount: async (account?: string) => {
      if (account === undefined) {
        wallet.account = undefined
        wallet.accountCompact = undefined
        wallet.balance = undefined
        return
      }

      wallet.account = account
      wallet.accountCompact = `${account.substring(0, 4)}...${account.substring(account.length - 4)}`

      const user = await useAccount(account)
      wallet.profile = { imageURL: user.imageURL, level: user.level, type: user.type, userSlug: useSlug(user.username), username: user.username || wallet.accountCompact }

      const balance = await wallet.provider?.getBalance(wallet.account)
      wallet.balance = ethers.utils.formatEther(balance)
    },

    switchNetwork: async (config: { chainId: string }) => {
      if (wallet.network?.chainId.toString() === config.chainId) { return }

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

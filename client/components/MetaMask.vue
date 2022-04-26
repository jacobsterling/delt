<script lang="ts">
import MetaMaskOnboarding from "@metamask/onboarding"
// import PopperVue from '@soldeplata/popper-vue'

let disable = ref(false)

const showWallet = () => {
  if (MetaMaskOnboarding.isMetaMaskInstalled() === false) {
    disable.value = true
    new MetaMaskOnboarding().startOnboarding()
    // } else {
    //   PopperVue.show = !PopperVue.show
    // }
  }
}

</script>

<template>
  <!-- <PopperVue :show="show">
    <template>
      <p> Login to MetaMask </p>
    </template>
  </PopperVue> -->
  <button
    class="border-[#2d2d2d] border-1 bg-white rounded-2xl px-4 py-2 font-size-20 text-1xl text-bold flex content-center"
    @click="showWallet" disabled="disable.value">
    {{ $wallet.accountCompact || "Connect Wallet" }}
  </button>
</template>

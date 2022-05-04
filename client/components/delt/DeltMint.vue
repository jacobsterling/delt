<script setup lang="ts">

const { $wallet: wallet } = useNuxtApp()

const loadingMint = ref<Boolean>(false)

const mint = async (tokenId: string) => {
  loadingMint.value = true
  if (wallet) { const { mintStatus, tokenURI } = await useContract(wallet, tokenId) }
  loadingMint.value = false
}

</script>

<template>
  <div>
    <!-- <h5>ID # {{ tokenID }}</h5>
    <button v-if="!isMinted" @click="mintToken">
      Mint
    </button>
    <button v-else @click="getURI">
      Taken! Show URI
    </button> -->
  </div>
</template>
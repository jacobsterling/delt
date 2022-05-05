<script setup lang="ts">

const client = useSupabaseClient()

// const { $wallet: wallet } = useNuxtApp()

// const { data: download } = await client
//     .storage
//     .from("designs")
//     .download(`designs/${tokenId}`)

//   image.value = download

// const loadingMint = ref<Boolean>(false)

// const route = useRoute()

// const tokenId = ref<string>(route.path)
// const { data: design } = await client.from("designs").select("*").eq("slug", tokenId).single()

// const isMinted = ref<Boolean>(false)
// const tokenURI = ref<String>(undefined)

// if (design.metadata) { isMinted.value = true }

// console.log(tokenId.value)

// const mint = async (design: string) => {
//   loadingMint.value = true
//   if (wallet) {
//     const { mintStatus, tokenURI: uri } = await useContract(wallet, design)
//     isMinted.value = mintStatus
//     tokenURI.value = uri
//   }
//   loadingMint.value = false
// }

</script>

<template>
  <div>
    mint
    <!-- <h5>ID # {{ tokenId }}</h5>
    <button v-if="!isMinted" @click="mint(tokenId)">
      Mint
    </button>
    <button v-else>
      {{ tokenURI }}
    </button> -->
  </div>
</template>

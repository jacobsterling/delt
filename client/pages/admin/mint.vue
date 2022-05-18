<script setup lang="ts">

const client = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

if (!user) { router.push("/") }

const { type } = await useUser(user.value.id)

if (type !== "admin") { router.push("/") }

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()

const loadingMint = ref<Boolean>(false)
const isMinted = ref<Boolean>(false)

const { data: items } = await client.from("items").select("*").is("tokenId", null)

type itemObj = typeof items[0]

// if (item.metadataURI) { isMinted.value = true }

const getItemImage = async (slug: string) => {
  try {
    const { data: download, error } = await client
      .storage
      .from("items")
      .download(`${slug}.png`)
    if (error) { throw error }
    return download
  } catch (error) {
    console.error(error)
  }
}

const mint = async (item: itemObj) => {
  loadingMint.value = true
  const image = await getItemImage(item.slug)
  if (wallet) {
    const mintResult = await contractRef.awardItem(wallet, item, image)
    isMinted.value = mintResult
  }
  loadingMint.value = false
}

</script>

<template>
  <div>
    <ClientOnly>
      <NuxtLink :href="`https://ropsten.etherscan.io/address/${contractRef.getContractAddress()}`"
        class="d-button-emerald">
        Pointed at contract: {{ contractRef.getContractAddress() }}
      </NuxtLink>
    </ClientOnly>
    <div class="justify-center flex-no-shrink w-90%">
      <ItemCard v-for="item in items" :key="item.id" :item="item">
        <button v-if="!isMinted" class="d-button-emerald" @click="mint(item)">
          Mint
        </button>
        <button v-else class="d-button-red">
          Minted
        </button>
        {{ item.tokenId }}
      </ItemCard>
    </div>
  </div>
</template>

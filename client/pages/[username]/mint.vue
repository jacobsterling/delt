<script setup lang="ts">

const client = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const route = useRoute()

if (!user.value) { router.push("/") } else {
  const { username, type } = await useUser(user.value.id)

  if (username !== route.params.username) {
    if (type !== "admin") {
      router.push("/")
    }
  }
}

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()

const loadingMint = ref<Boolean>(false)
const isMinted = ref<Boolean>(false)

const { data: uid } = await client.from("usernames").select("*").eq("username", route.params.username).single()

const { data: items } = await client.from("items").select("*").eq("published", false).eq("createdBy", uid.id)

type itemObj = typeof items[0]

const getitemImage = async (slug: string) => {
  try {
    const { data: download, error } = await client
      .storage
      .from("items")
      .download(`${slug}.png`)
    if (error) { throw error }
    return download
  } catch (error) {
    console.log(error)
  }
}

const mint = async (item: itemObj) => {
  loadingMint.value = true
  const image = await getitemImage(item.slug)
  if (wallet) {
    const mintResult = await contractRef.payToMint(wallet, item, image)
    isMinted.value = mintResult
  }
  loadingMint.value = false
}

</script>

<template>
  <div>
    <ClientOnly>
      <NuxtLink :href="`https://ropsten.etherscan.io/address/${contractRef.contractAddress}`" class="d-button-emerald">
        Pointed at contract: {{ contractRef.contractAddress }}
      </NuxtLink>
    </ClientOnly>
    <div class="justify-center flex-inline flex-no-shrink w-90%">
      <itemCard v-for="item in items" :key="item.id" :item="item">
        <button v-if="!isMinted" class="d-button-emerald" @click="mint(item)">
          Mint
        </button>
        <button v-else class="d-button-red">
          Minted
        </button>
      </itemCard>
    </div>
  </div>
</template>

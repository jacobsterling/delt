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

const { data: designs } = await client.from("designs").select("*").eq("published", false).eq("createdBy", uid.id)

type designObj = typeof designs[0]

const getDesignImage = async (slug: string) => {
  try {
    const { data: download, error } = await client
      .storage
      .from("designs")
      .download(`${slug}.png`)
    if (error) { throw error }
    return download
  } catch (error) {
    console.log(error)
  }
}

const mint = async (design: designObj) => {
  loadingMint.value = true
  const image = await getDesignImage(design.slug)
  if (wallet) {
    const mintResult = await contractRef.payToMint(wallet, design, image)
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
      <DesignCard v-for="design in designs" :key="design.id" :design="design">
        <button v-if="!isMinted" class="d-button-emerald" @click="mint(design)">
          Mint
        </button>
        <button v-else class="d-button-red">
          Minted
        </button>
      </DesignCard>
    </div>
  </div>
</template>

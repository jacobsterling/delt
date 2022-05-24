<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const { data: item } = await client.from("items").select("*").eq("slug", route.params.slug).single()

if (!item) { router.push("/404") }

const { username } = await useAccount(item.owner)

if (username !== route.params.username) { router.push(`/${username}/${item.slug}`) }

const { data: url } = client.storage.from("items").getPublicUrl(`${item.slug}.svg`)

const tokenURI = ref<string>("Connect wallet to see metadataURI")

if (wallet) {
  const contract = contractRef.read(wallet.provider)
  tokenURI.value = await contract.tokenURI(item.tokenId)
  // Buffer.from(base64, "base64").toString("binary")
}

</script>

<template>
  <div>
    <img :src="url.publicURL" height="100px" width="200px">
    {{ item }}
    <ItemPurchase v-if="item.auction" :item="item" />
    <h1>{{ tokenURI }}</h1>
  </div>
</template>

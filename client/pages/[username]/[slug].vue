<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const { data: item } = await client.from("items").select("*").eq("slug", route.params.slug).single()

if (!item) { router.push("/404") }

const { username } = await useAccount(item.owner)

if (username !== route.params.username) { router.push(`/${username}/${item.slug}`) }

const { data: url } = client.storage.from("items").getPublicUrl(`${item.slug}.jpg`)

const metadataURI = ref<string>("Connect wallet to see metadataURI")
const attributes = ref<any[]>(undefined)

if (wallet) {
  contractRef.initContract(wallet.signer)
  attributes.value = await contractRef.getAttributes(item.tokenId)
  // metadataURI.value = await contractRef.getURI(item.tokenId)
}

</script>

<template>
  <div>
    <img :src="url.publicURL" height="100px" width="200px">
    {{ item }}
    <ItemPurchase v-if="item.auction" :item="item" />
    <h1>{{ metadataURI }}</h1>
    <h1>{{ attributes }}</h1>
  </div>
</template>

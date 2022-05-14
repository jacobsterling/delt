<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const { data: item } = await client.from("items").select("*").eq("published", true).eq("slug", route.params.slug).single()

if (!item) { router.push("/404") }

const { username } = await useUser(item.ownedBy)

if (username !== route.params.username) { router.push(`/${username}/${item.slug}`) }

const { data: url } = client.storage.from("items").getPublicUrl(`${item.slug}.jpg`)

const metadataURI = ref<string>("Connect wallet to see metadataURI")

if (wallet) {
  contractRef.deployContract(wallet)
  metadataURI.value = await contractRef.getURI(item.tokenId)
}

</script>

<template>
  <div>
    <img :src="url.publicURL" height="100px" width="200px">
    {{ item }}
    {{ metadataURI }}
  </div>
</template>

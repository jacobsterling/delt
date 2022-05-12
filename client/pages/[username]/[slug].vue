<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const { data: design } = await client.from("designs").select("*").eq("published", true).eq("slug", route.params.slug).single()

if (!design) { router.push("/404") }

const { username } = await useUser(design.createdBy)

if (username !== route.params.username) { router.push(`/${username}/${design.slug}`) }

const { data: url } = client.storage.from("designs").getPublicUrl(`${design.slug}.jpg`)

const metadataURI = ref<string>("Connect wallet to see metadataURI")

if (wallet) {
  contractRef.deployContract(wallet)
  metadataURI.value = await contractRef.getURI(design.tokenId)
}

</script>

<template>
  <div>
    <img :src="url.publicURL" height="100px" width="200px">
    {{ design }}
    {{ metadataURI }}
  </div>
</template>

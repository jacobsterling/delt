<script setup lang="ts">

import { ExclamationIcon, FireIcon } from "@heroicons/vue/outline"

const client = useSupabaseClient()
const route = useRoute()
// const router = useRouter()
const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const { data: item } = await client.from("items").select("*").eq("slug", route.params.slug).single()

// if (!item) { router.push("/404") }

// const { username } = await useAccount(item.owner)

// if (username !== route.params.username) { router.push(`/${username}/${item.slug}`) }

const { data: url } = client.storage.from("items").getPublicUrl(`${item.slug}.svg`)

const tokenURI = ref<string>("Connect wallet to see metadataURI")

const price = ref<number>(0)

const auction = ref<boolean>(false)

const endAuction = async () => {
  await contractRef.endAuction(wallet, item)
}

const startAuction = async () => {
  item.auctioned = true
  await contractRef.addListing(wallet, item, price.value)
}

const addListing = async () => {
  await contractRef.addListing(wallet, item, price.value)
}

const removeListing = async () => {
  await contractRef.removeListing(wallet, item)
}

</script>

<template>
  <div>
    <img :src="url.publicURL" height="100px" width="200px">
    {{ item }}
    <ItemPurchase v-if="item.auctioned" :item="item" />
    <h1>{{ tokenURI }}</h1>
  </div>
  <input v-model="price" type="number" step="0.001" min="0">
  <div v-if="item.listed">
    <DeltButton v-if="item.autioned" class="d-button-sky p-1 flex" @click="endAuction()">
      <div class="flex-inline justify-between align-center">
        <ExclamationIcon class="d-icon-6" />
        <div class="flex text-center">
          End Auction
        </div>
      </div>
    </DeltButton>
    <DeltButton v-else class="d-button-sky p-1 flex" @click="removeListing()">
      <div class="flex-inline justify-between align-center">
        <ExclamationIcon class="d-icon-6" />
        <div class="flex text-center">
          Remove Listing
        </div>
      </div>
    </DeltButton>
  </div>
  <div v-else>
    <label for="auction" />
    <input v-model="auction" name="auction" type="checkbox">
    <DeltButton class="d-button-sky p-1 flex" @click="addListing()">
      <div class="flex-inline justify-between align-center">
        <FireIcon class="d-icon-6" />
        <div class="flex text-center">
          Add Listing
        </div>
      </div>
    </DeltButton>
  </div>
</template>

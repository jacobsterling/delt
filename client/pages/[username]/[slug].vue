<script setup lang="ts">

import { ExclamationIcon, FireIcon } from "@heroicons/vue/outline"

import { Stat, Attr, Item } from "../../plugins/contract.client"

const svg = ref<string>("<?xml version=\\\"1.0\\\" standalone = \\\"yes\\\" ?><svg xmlns=\\\"http://www.w3.org/2000/svg\\\" width = \\\"32\\\" height = \\\"32\\\" ><path style=\\\"fill:#030205; stroke:none;\\\" d = \\\"M0 0L0 32L12 32L12 27L9 26L11 18C15.0438 20.0969 16.9562 20.0969 21 18L25 21L20 32L32 32L32 0L0 0z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M9 15L9 16L23 16L23 15L18 8L21 9C15.633 3.91586 12.8464 11.7085 9 15z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M13 17L14 18L13 17z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M14 17L15 18L14 17z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M17 17L18 18L17 17z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M18 17L19 18L18 17z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M11 18L11 31L21 31L18 21L22 21L21 18L11 18z\\\" /><path style=\\\"fill:#6b5033; stroke:none;\\\" d = \\\"M18 21C19.2603 24.7979 21.3258 24.9792 25 24L25 21L18 21z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M20 21L20 22L23 22L20 21z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M23 21L24 22L23 21M24 22L25 23L24 22z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M9 24L12 27L9 24M20 25L20 26L23 26L20 25z\\\" /></svg>")

const client = useSupabaseClient()
const route = useRoute()

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const { data: item } = await client.from("items").select("*").eq("slug", route.params.slug).single()
const { data: url } = client.storage.from("items").getPublicUrl(`${item.name}.svg`)

const tokenURI = ref<string>("Connect wallet to see metadataURI")

const price = ref<number>(0)

const auction = ref<boolean>(false)

const endAuction = async () => {
  await contractRef.endAuction(wallet, item)
}

const addListing = async () => {
  if (auction.value) {
    item.auctioned = true
  }
  await contractRef.addListing(wallet, item, price.value)
}

const removeListing = async () => {
  await contractRef.removeListing(wallet, item)
}

const mint = async () => {
  if (wallet) {
    item.tokenId = await contractRef.payToMintItem(wallet, item, svg.value)
  }
}

const burn = async () => {
  await contractRef.burnItem(wallet, item)
  item.tokenId = undefined
}

const setAttribute = async () => {
  const stat: Stat = {
    desc: "ultra light weight",
    statKey: "cloth",
    tier: 1,
    value: 1
  }
  const attribute: Attr = {
    attrKey: "weight",
    stats: [stat]
  }
  await contractRef.modifiyItem(wallet, item, 1, attribute)
}

const removeAttribute = async () => {
  const attribute: Attr = {
    attrKey: "weight",
    stats: []
  }
  await contractRef.modifiyItem(wallet, item, 1, attribute)
}

const setStat = async () => {
  const stat: Stat = {
    desc: "flaming silk worm",
    statKey: "fire",
    tier: 1,
    value: 1
  }
  const attribute: Attr = {
    attrKey: "defence",
    stats: [stat]
  }
  await contractRef.modifiyItem(wallet, item, 1, attribute)
}

const removeStat = async () => {
  const stat: Stat = {
    desc: "flaming silk worm",
    statKey: "fire",
    tier: 1,
    value: 0
  }
  const attribute: Attr = {
    attrKey: "defence",
    stats: [stat]
  }
  await contractRef.modifiyItem(wallet, item, 0, attribute)
}

const getURI = async () => {
  try {
    tokenURI.value = await contractRef.readDeltItems(wallet.provider).tokenURI(item.tokenId)
    window.open(tokenURI.value)
  } catch (Error) {
    console.log(Error)
  }
}

const getListings = async () => {
  try {
    console.table(await contractRef.readDeltTrader(wallet.provider).getListings(item.tokenId))
  } catch (Error) {
  }
}

</script>

<template>
  <div>
    <img :src="url.publicURL" height="100px" width="200px">
    {{ item }}
    <ItemPurchase v-if="item.auctioned" :item="item" />
    <h1>{{ tokenURI }}</h1>
  </div>
  <ClientOnly>
    <NuxtLink :href="`https://ropsten.etherscan.io/address/${contractRef.deltItemsAddress}`" class="d-button-emerald">
      Pointed at contract: {{ contractRef.deltItemsAddress }}
    </NuxtLink>
  </ClientOnly>
  <div v-if="item.tokenId == null">
    <button class="d-button-emerald" @click="mint()">
      Mint
    </button>
  </div>
  <div v-else>
    <DeltButton class="d-button-rose" @click="getURI()">
      get URI
    </DeltButton>
    <DeltButton class="d-button-rose" @click="getListings()">
      get Listings
    </DeltButton>

    <button class="d-button-red" @click="burn()">
      Burn
    </button>
    <div class="justify-center flex-no-shrink w-90%">
      <button class="d-button-fuchsia" @click="removeAttribute()">
        removeAttribute
      </button>
      <button class="d-button-sky" @click="removeStat()">
        removeStat
      </button>
      <button class="d-button-amber" @click="setAttribute()">
        setAttribute
      </button>
      <button class="d-button-indigo" @click="setStat()">
        setStat
      </button>
      <ClientOnly>
        <NuxtLink :href="`https://ropsten.etherscan.io/address/${contractRef.deltTraderAddress}`"
          class="d-button-emerald">
          Pointed at contract: {{ contractRef.deltTraderAddress }}
        </NuxtLink>
      </ClientOnly>
      <input v-model="price" type="number" step="0.001" min="0">
      <div v-if="item.listed">
        <DeltButton v-if="item.auctioned" class="d-button-sky p-1 flex" @click="endAuction()">
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
        <label for="auction" />Auction
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
    </div>
  </div>
</template>

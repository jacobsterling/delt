<script setup lang="ts">

import { ExclamationIcon, FireIcon } from "@heroicons/vue/outline"

import { Stat, Attr } from "../../plugins/contract.client"

const client = useSupabaseClient()
const route = useRoute()

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const { data: token } = await client.from("tokens").select("*").eq("slug", route.params.slug).single()

const tokenURI = ref<string>(undefined)

const price = ref<number>(0)

const auction = ref<boolean>(false)

const burnAmount = ref<number>(1)
const auctionAmount = ref<number>(5)

const endAuction = async () => {
  await contractRef.endAuction(wallet)
}

const addListing = async () => {
  await contractRef.addListing(wallet, token, auction.value, price.value, auctionAmount.value)
}

const burn = async () => {
  if (token.upgradable) {
    await contractRef.burnItem(wallet, token)
  } else {
    await contractRef.burnEntities(wallet, token, burnAmount.value)
  }
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
  await contractRef.modifiyItem(wallet, token, 1, attribute)
}

const removeAttribute = async () => {
  const attribute: Attr = {
    attrKey: "weight",
    stats: []
  }
  await contractRef.modifiyItem(wallet, token, 1, attribute)
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
  await contractRef.modifiyItem(wallet, token, 1, attribute)
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
  await contractRef.modifiyItem(wallet, token, 0, attribute)
}

const getURI = async () => {
  try {
    if (token.upgradable) {
      window.open(await contractRef.readDeltItems(wallet.provider).tokenURI(token.tokenId))
    } else {
      window.open(await contractRef.readDeltEntities(wallet.provider).uri(token.tokenId))
    }
  } catch (Error) {
    console.log(Error)
  }
}

const getListings = async () => {
  try {
    console.table(await contractRef.readDeltTrader(wallet.provider).getListings([contractRef.tokenAddress(token.upgradable), token.tokenId]))
  } catch (Error) {
  }
}

</script>

<template>
  <div>
    {{ token }}
  </div>
  <ClientOnly>
    <NuxtLink :href="`https://ropsten.etherscan.io/address/${contractRef.tokenAddress(token.upgradable)}`"
      class="d-button-emerald">
      Pointed at contract: {{ contractRef.tokenAddress(token.upgradable) }}
    </NuxtLink>
  </ClientOnly>
  <DeltButton class="d-button-rose" @click="getURI()">
    get URI
  </DeltButton>
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
  <DeltButton class="d-button-rose" @click="getListings()">
    get Listings
  </DeltButton>
  <DeltButton class="d-button-red" @click="burn()">
    Burn
  </DeltButton>
  <div class="justify-center flex-no-shrink w-90%">
    <DeltButton class="d-button-fuchsia" @click="removeAttribute()">
      removeAttribute
    </DeltButton>
    <DeltButton class="d-button-sky" @click="removeStat()">
      removeStat
    </DeltButton>
    <DeltButton class="d-button-amber" @click="setAttribute()">
      setAttribute
    </DeltButton>
    <DeltButton class="d-button-indigo" @click="setStat()">
      setStat
    </DeltButton>
    <ClientOnly>
      <NuxtLink :href="`https://ropsten.etherscan.io/address/${contractRef.deltTraderAddress}`"
        class="d-button-emerald">
        Pointed at contract: {{ contractRef.deltTraderAddress }}
      </NuxtLink>
    </ClientOnly>
    <input v-model="price" type="number" step="0.001" min="0">

    <TokenPurchase v-if="token.auctioned" :token="token" />
    <DeltButton v-if="token.auctioned" class="d-button-sky p-1 flex" @click="endAuction()">
      <div class="flex-inline justify-between align-center">
        <ExclamationIcon class="d-icon-6" />
        <div class="flex text-center">
          End Auction
        </div>
      </div>
    </DeltButton>
  </div>
</template>

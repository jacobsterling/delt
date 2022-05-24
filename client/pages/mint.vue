<script setup lang="ts">

import { Stat, Attr, Item } from "../plugins/contract.client"

const svg = ref<string>("<?xml version=\\\"1.0\\\" standalone = \\\"yes\\\" ?><svg xmlns=\\\"http://www.w3.org/2000/svg\\\" width = \\\"32\\\" height = \\\"32\\\" ><path style=\\\"fill:#030205; stroke:none;\\\" d = \\\"M0 0L0 32L12 32L12 27L9 26L11 18C15.0438 20.0969 16.9562 20.0969 21 18L25 21L20 32L32 32L32 0L0 0z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M9 15L9 16L23 16L23 15L18 8L21 9C15.633 3.91586 12.8464 11.7085 9 15z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M13 17L14 18L13 17z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M14 17L15 18L14 17z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M17 17L18 18L17 17z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M18 17L19 18L18 17z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M11 18L11 31L21 31L18 21L22 21L21 18L11 18z\\\" /><path style=\\\"fill:#6b5033; stroke:none;\\\" d = \\\"M18 21C19.2603 24.7979 21.3258 24.9792 25 24L25 21L18 21z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M20 21L20 22L23 22L20 21z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M23 21L24 22L23 21M24 22L25 23L24 22z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M9 24L12 27L9 24M20 25L20 26L23 26L20 25z\\\" /></svg>")

const client = useSupabaseClient()

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()

const loadingMint = ref<Boolean>(false)
const isMinted = ref<Boolean>(false)

const { data: items } = await client.from("items").select("*")
// .is("tokenId", null)

const getItemImage = async (slug: string) => {
  try {
    const { data: download, error } = await client
      .storage
      .from("items")
      .download(`${slug}.svg`)
    if (error) { throw error }
    console.log(download)
    return download
  } catch (error) {
    console.error(error)
  }
}

const mint = async (item: Item) => {
  loadingMint.value = true
  const image = await getItemImage(item.slug)
  if (wallet) {
    await contractRef.connect(wallet.signer)
    const mintResult = await contractRef.awardItem(wallet, item, svg.value)
    isMinted.value = mintResult
  }
  loadingMint.value = false
}

const burn = async (item: Item) => {
  if (wallet) {
    await contractRef.connect(wallet.signer)
    await contractRef.burnItem(wallet, item)
    isMinted.value = false
  }
}

const setAttribute = async (item: Item) => {
  const stat: Stat = {
    desc: "ultra light weight",
    rarity: "common",
    statKey: "cloth",
    value: 1
  }
  const attribute = {
    attrKey: "weight",
    stats: [Object.values(stat)]
  }

  await contractRef.connect(wallet.signer)
  await contractRef.setAttribute(item.tokenId, attribute)
}

const removeAttribute = async (item: Item) => {
  const attribute: Attr = {
    attrKey: "weight",
    stats: []
  }

  await contractRef.connect(wallet.signer)
  await contractRef.setAttribute(item.tokenId, attribute)
}

const setStat = async (item: Item) => {
  const attrKey = "defence"
  const stat: Stat = {
    desc: "flaming silk worm",
    rarity: "common",
    statKey: "fire",
    value: 1
  }
  await contractRef.connect(wallet.signer)
  await contractRef.setStat(item.tokenId, attrKey, stat)
}

const removeStat = async (item: Item) => {
  const attrKey = "defence"
  const stat: Stat = {
    desc: "flaming silk worm",
    rarity: "rare",
    statKey: "fire",
    value: 0
  }
  await contractRef.connect(wallet.signer)
  await contractRef.setStat(item.tokenId, attrKey, stat)
}

const allTokens = ref<any>("Get All Tokens")

const getAllTokens = async () => {
  const contract = contractRef.read(wallet.provider)
  allTokens.value = await contract.totalSupply()
}

</script>

<template>
  <div>
    <ClientOnly>
      <NuxtLink :href="`https://ropsten.etherscan.io/address/${contractRef.getAddress()}`" class="d-button-emerald">
        Pointed at contract: {{ contractRef.getAddress() }}
      </NuxtLink>
    </ClientOnly>
    <div class="d-button-emerald my-2" @click="getAllTokens()">
      {{ allTokens }}
    </div>
    <div class="justify-center flex-no-shrink w-90%">
      <ItemCard v-for="item in items" :key="item.id" :item="item">
        <button v-if="!isMinted" class="d-button-emerald" @click="mint(item)">
          Mint
        </button>
        <button class="d-button-red" @click="burn(item)">
          Burn
        </button>
        <button class="d-button-fuchsia" @click="removeAttribute(item)">
          removeAttribute
        </button>
        <button class="d-button-sky" @click="removeStat(item)">
          removeStat
        </button>
        <button class="d-button-amber" @click="setAttribute(item)">
          setAttribute
        </button>
        <button class="d-button-indigo" @click="setStat(item)">
          setStat
        </button>
      </ItemCard>
    </div>
  </div>
</template>

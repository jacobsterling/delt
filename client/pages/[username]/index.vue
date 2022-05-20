<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()

const { data: userData } = await client.from("usernames").select("*").eq("username", route.params.username).single()

const { data: itemsAuctioned } = await client.from("items").select("*").eq("auction", true).eq("owner", userData.account)
const { data: itemsUnauctioned } = await client.from("items").select("*").eq("auction", false).eq("owner", userData.account)

const state = ref<boolean>(true)

</script>

<template>
  <div class="inline-flex justify-left">
    <button class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm" @click="state = !state">
      <div v-if="state">
        Auctioned
      </div>
      <div v-else>
        Unauctioned
      </div>
    </button>
  </div>
  <div v-if="state" class="inline-flex justify-center">
    <ItemCard v-for="item in itemsAuctioned" :item="item">
      <li>
        <ItemPurchase :item="item" />
      </li>
    </ItemCard>
  </div>
  <div v-else class="inline-flex justify-center">
    <ItemCard v-for="item in itemsUnauctioned" :item="item" />
  </div>
</template>

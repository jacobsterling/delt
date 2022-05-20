<script setup lang="ts">

const client = useSupabaseClient()

const LIMIT = 5
const FROM = ref(0)
const TO = ref(LIMIT)
const status = ref(true)

const { data: items } = await client.from("items").select("*").eq("auction", true).neq("owner", undefined).order("createdAt").range(FROM.value, TO.value)

const loaditems = async () => {
  FROM.value = TO.value + 1
  TO.value = FROM.value + LIMIT
  const { data: newitems } = await client.from("items").select("*").eq("auction", true).neq("owner", undefined).order("createdAt").range(FROM.value, TO.value)
  items.concat(newitems)
  if (items.length < LIMIT) {
    status.value = false
  }
}
</script>

<template>
  <div class="justify-center flex-wrap w-90%">
    <ItemCard v-for="item in items" :item="item">
      <li>
        <ItemPurchase :item="item" />
      </li>
    </ItemCard>
    <footer class="w-100% justify-center">
      <DeltButton v-if="status" class="d-button-cyan flex" @click="loaditems">
        Load more items
      </DeltButton>
    </footer>
  </div>
</template>

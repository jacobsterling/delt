<script setup lang="ts">

const client = useSupabaseClient()

const LIMIT = 5
const FROM = ref(0)
const TO = ref(LIMIT)
const status = ref(true)

const { data: items } = await client.from("items").select("*").neq("owner", undefined).order("createdAt").range(FROM.value, TO.value)

const loaditems = async () => {
  FROM.value = TO.value + 1
  TO.value = FROM.value + LIMIT
  const { data: newitems } = await client.from("items").select("*").neq("owner", undefined).order("createdAt").range(FROM.value, TO.value)
  items.concat(newitems)
  if (items.length < LIMIT) {
    status.value = false
  }
}
</script>

<template>
  <div class="justify-center flex-wrap w-90%">
    <ItemCard v-for="item in items" :item="item">
      <ul class="grid justify-items-end my-2">
        <li>
          <DeltButton class="d-button-emerald p-1 flex">
            <div class="flex-inline justify-between align-center">
              <img src="../assets/ethereum.svg" size="5px" class="d-icon-5 flex">
              <div class="flex text-center">
                {{ item.price }}
              </div>
            </div>
          </DeltButton>
        </li>
      </ul>
    </ItemCard>
    <footer class="w-100% justify-center">
      <DeltButton v-if="status" class="d-button-cyan flex" @click="loaditems">
        Load more items
      </DeltButton>
    </footer>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()

const LIMIT = 5
const FROM = ref(0)
const TO = ref(LIMIT)
const status = ref(true)

const designs = await client.from("designs").select("*").order("created_at").range(FROM.value, TO.value)
const designsData = designs.data

const loadDesigns = async () => {
  FROM.value = TO.value + 1
  TO.value = FROM.value + LIMIT
  const designs = await client.from("designs").select("*").order("created_at").range(FROM.value, TO.value)
  designsData.concat(designs.data)
  if (designs.data.length < LIMIT) {
    status.value = false
  }
}
</script>

<template>
  <div v-for="design in designsData" class="mx-auto my-15 px-4 dark:text-white w-90% max-w-screen-xl">
    <DesignCard :design="design" />
  </div>
  <div class="container mx-auto text-center">
    <button v-if="status.value" @click="loadDesigns">
      Load more designs
    </button>
    <p v-else>
      You have reached the end...
    </p>
  </div>
</template>

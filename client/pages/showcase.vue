<script setup lang="ts">
const client = useSupabaseClient()

const LIMIT = 5
const FROM = ref(0)
const TO = ref(LIMIT)
const status = ref(true)

const { data: designs } = await client.from("designs").select("*").eq("published", true).order("createdAt").range(FROM.value, TO.value)

const loadDesigns = async () => {
  FROM.value = TO.value + 1
  TO.value = FROM.value + LIMIT
  const { data: newDesigns } = await client.from("designs").select("*").eq("published", true).order("createdAt").range(FROM.value, TO.value)
  designs.concat(newDesigns)
  if (designs.length < LIMIT) {
    status.value = false
  }
}
</script>

<template>
  <div class="justify-center flex-no-shrink w-90%">
    <DesignCard v-for="design in designs" :design="design" />
  </div>

  <div class="container mx-auto text-center">
    <button v-if="status" class="flex-no-shrink text-white py-2 px-4 my-2 mx-6 rounded-2xl bg-teal hover:bg-teal-dark"
      @click="loadDesigns">
      Load more designs
    </button>
  </div>
</template>

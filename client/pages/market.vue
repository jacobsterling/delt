<script setup lang="ts">
import { CurrencyPoundIcon } from "@heroicons/vue/solid"

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
    <DesignCard v-for="design in designs" :design="design">
      <div class="flex-block">
        <DeltButton class="d-button-emerald p-1 flex">
          <div class="flex-inline justify-around align-center">
            <img src="../assets/ethereum.svg" size="5px" class="d-icon-5 flex">
            <div class="flex text-center">
              {{ design.ethPrice }}
            </div>
          </div>
        </DeltButton>
        <DeltButton class="d-button-cyan p-1 flex my-1">
          <div class="flex-inline justify-around align-center">
            <img src="../assets/t-shirt.svg" size="5px" class="d-icon-5 flex">
            <div class="flex text-center">
              {{ design.price }}
            </div>
          </div>
        </DeltButton>
      </div>
    </DesignCard>
    <footer class="w-100% justify-center">
      <DeltButton v-if="status" class="d-button-cyan flex" @click="loadDesigns">
        Load more designs
      </DeltButton>
    </footer>
  </div>
</template>

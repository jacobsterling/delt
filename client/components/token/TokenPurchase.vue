
<script setup lang="ts">
import { FireIcon } from "@heroicons/vue/outline"
const amount = ref<number>(undefined)

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const props = defineProps({
  listing: {
    default: undefined,
    required: true,
    type: Object,
    validator: prop => typeof prop === "object"
  }
})

const purchase = async () => {
  if (props.listing.auctioned) {
    await contractRef.bid(wallet, props.listing, amount.value)
  } else {
    await contractRef.purchase(wallet, props.listing)
  }
}

</script>

<template>
  <li v-if="props.listing.auctioned">
    <DeltButton class="d-button-emerald p-1 flex">
      <div class="flex-inline justify-between align-center">
        <input v-model="amount" type="text" placeholder="Bid Amount">
      </div>
    </DeltButton>
  </li>
  <li>
    <DeltButton class="d-button-orange p-1 flex" @click="purchase()">
      <div class="flex-inline justify-between align-center">
        <FireIcon size="5px" class="d-icon-5 flex" />
        <div class="flex text-center">
          {{ props.listing.price }}
        </div>
      </div>
    </DeltButton>
  </li>
</template>

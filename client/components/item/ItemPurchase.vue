
<script setup lang="ts">
const props = defineProps({
  item: {
    default: undefined,
    required: true,
    type: Object,
    validator: prop => typeof prop === "object"
  }
})

</script>

<template>
  <DeltButton class="d-button-emerald p-1 flex">
    <div class="flex-inline justify-between align-center">
      <img src="../../assets/ethereum.svg" size="5px" class="d-icon-5 flex">
      <div class="flex text-center">
        {{ props.item.price }}
      </div>
    </div>
  </DeltButton>
</template>

<script setup lang="ts">
const props = defineProps({
  design: {
    default: undefined,
    required: true,
    type: String,
    validator: prop => typeof prop === "string"
  },
  visible: {
    default: true,
    required: false,
    type: Boolean,
    validator: prop => typeof prop === "boolean"
  }
})

</script>

<template>
  <div class="p-2 mx-1 my-0 shadow-2xl">
    <h1>{{ props.design.slug }}</h1>
    <footer class="inline">
      Created By: {{ props.design.created_by }}
      Owned By: {{ props.design.owned_by }}
    </footer>
  </div>
</template>

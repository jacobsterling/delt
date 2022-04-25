<script setup lang="ts">
const props = defineProps({
  visible: {
    default: false,
    required: false,
    type: Boolean,
    validator: prop => typeof prop === "boolean"
  }
})
</script>

<template>
  <t-model v-if="props.visible" header="Login"></t-model>
</template>

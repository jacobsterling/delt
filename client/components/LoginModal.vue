<script setup lang="ts">
defineProps({
  visible: {
    default: true,
    required: false,
    type: Boolean,
    validator: prop => typeof prop === "boolean"
  }
})
</script>

<template>
  <div v-if="visible"
    class="absolute bg-white rounded shadow p-8 m-4 max-w-xs max-h-full text-center overflow-y-scroll">
    <div class="mb-4">
      <h1>Welcome!</h1>
    </div>
    <div class="mb-8">
      <p>Ready to get started? Keep scrolling to see some great components.</p>
    </div>
    <div class="flex justify-center">
      <button class="flex-no-shrink text-white py-2 px-4 rounded bg-teal hover:bg-teal-dark">
        Login
      </button>
    </div>
  </div>
  <!-- <div v-if="visible" class="container mx-auto">
    Modal
  </div> -->
</template>

<script setup lang="ts">
defineEmits(["click"])
</script>

<template>
  <button
    class="border-[#2d2d2d] border-1 bg-white rounded-2xl px-4 py-1 font-size-20 text-1xl text-bold flex content-center"
    @click="$emit('click', $event)">
    Login
  </button>
</template>

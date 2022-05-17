<script setup lang="ts">
useHead({
  title: "Delt"
})

const downloaded = ref<boolean>(false)

const game = await import("../../delt/game.js")

downloaded.value = true

await game.launch("containerId")

</script>

<template>
  <div v-if="downloaded" ref="containerId" />
</template>

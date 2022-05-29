<script setup lang="ts">
const gameInstance = ref()
const downloaded = ref(false)

onMounted(async () => {
  if (process.client) {
    downloaded.value = true
    const game = await import("../../delt/game")
    gameInstance.value = game.launch("delt-container")
  }
})
</script>

<template>
  <div>
    <div v-if="downloaded" id="delt-container" />
    <div v-else>
      Downloading...
    </div>
  </div>
</template>

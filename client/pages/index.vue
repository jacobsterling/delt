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
  <div class="w-100% h-100%">
    <div v-if="downloaded" id="delt-container" />
    <div v-else>
      Downloading...
    </div>
  </div>
</template>

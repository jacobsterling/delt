<script setup lang="ts">

const { $manager } = useNuxtApp()

onMounted(() => {
  $manager.launch("delt-container")
})

onUnmounted(() => {
  $manager.game?.destroy(false)
})
</script>

<template>
  <div id="delt-container" />
</template>

<script setup lang="ts">import { Ref } from 'vue';

const game: Ref<Phaser.Game | undefined> = ref()

onMounted(() => {
  game.value = useGame("delt-container", true)
})

onUnmounted(() => {
  game.value?.destroy(false)
})

</script>

<template>
  <div id="delt-container" />
</template>

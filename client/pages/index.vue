<script>
export default {
  data() {
    return {
      downloaded: false,
      gameInstance: null,
      containerId: "game-container"
    }
  },
  async mounted() {
    const game = await import(/* webpackChunkName: "game" */ "../../delt/game.js")
    this.downloaded = true
    this.$nextTick(() => {
      this.gameInstance = game.launch(this.containerId)
    })
  },
  unmounted() {
    this.gameInstance.destroy(false)
  }
}
</script>

<template>
  <div v-if="downloaded" :id="gameInstance" />
  <div v-else class="placeholder">
    Downloading ...
  </div>
</template>

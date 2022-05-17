<script>
export default {
  data() {
    return {
      containerId: "game-container",
      downloaded: false,
      gameInstance: null
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
  <div v-if="downloaded" :id="containerId" />
  <div v-else class="placeholder">
    Downloading ...
  </div>
</template>

<script setup lang="ts">
const gameInstance = ref()

const { $delt: delt } = useNuxtApp()

if (delt) {
  onMounted(() => {
    delt.launch("delt-container", true)
    gameInstance.value = delt.game
    delt.multiplayer.connect("van.near")
  })
}

</script>

<template>
  <div class="w-100% h-100%">
    <div v-if="delt?.visible" id="delt-container" />
    <div v-else>
      <!-- <div>
        <table>
          <div v-for="game in delt.multiplayer.games" :key="game.game_id">
            <tr>
              <th>{{ game.game_id }}</th>
              <th>{{ game.host_id }}</th>
              <th>{{ game.players }}</th>
            </tr>
          </div>
        </table>
      </div> -->
    </div>
  </div>
</template>

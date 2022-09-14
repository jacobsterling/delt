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
    <div v-if="delt?.multiplayer.game" id="delt-container" />
    <div v-else>
      <DeltButton class="d-button-green" @click="delt?.multiplayer.getGames()">
        Refresh
      </DeltButton>
      <table>
        <tr>
          <th class="px-4">
            Game Id
          </th>
          <th class="px-4">
            Players
          </th>
          <th class="px-4">
            Password Protected
          </th>
        </tr>
        <tr v-for="game in delt?.multiplayer.games" :key="game.game_id" class="d-button-green"
          @click="delt?.multiplayer.joinGame(game.game_id)">
          <td class="px-4">
            {{ game.game_id }}
          </td>
          <td class="px-4">
            {{ game.players }}
          </td>
          <td class="px-4">
            {{ game.password_protected }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  middleware: 'auth'
})

import { Ref } from 'vue';
import { GameConfig } from '~~/types/db';

const create_game_id: Ref<string | undefined> = ref(undefined)
const create_game_config: GameConfig = reactive({ player_limit: 1, teams: 1, level_required: 1, session_attempts: undefined, player_attempts: undefined } as GameConfig)
const create_game_expiry: Ref<Date | undefined> = ref(undefined)


const createGame = async () => {
  try {
    const res = await useNewGame(create_game_id.value as string, create_game_config, create_game_expiry.value)

    if (res) {
      navigateTo(`/${res.id}`)
    }

  } catch (e) {
    console.log(e)
  }
}

</script>

<template>
  <div>
    <input v-model="create_game_id" placeholder="game id" type="text" class="flex m-2" required="true" />
    <input v-model="create_game_expiry" placeholder="expiry date" type="datetime" class="flex m-2" />

    <div v-for="(_, key) in create_game_config" :key="key">
      <input v-model="create_game_config[key]" type="text" :placeholder="key" class="flex m-2">
    </div>

    <DeltButton class="d-button-green flex m-2" @click="createGame()">
      Create Game
    </DeltButton>
  </div>
</template>

<!-- eslint-disable camelcase -->
<script setup lang="ts">

import { Ref } from "vue"

import { ArrowPathIcon, ArrowLeftCircleIcon } from "@heroicons/vue/24/outline"

import { Game, Session } from "~~/types/db"

const router = useRouter()

const games = ref(await useGames())

const selected_game: Ref<Game | undefined> = ref(undefined)

const sessions: Ref<Session[]> = ref([])

const refreshGames = async () => {
  try {
    games.value = await useGames()
  } catch (e) {
    console.error("Query Games Error: ", e)
  }
}

const fetchSessions = async (game_id: string) => {
  try {
    sessions.value = await useSessions(game_id)
  } catch (e) {
    console.error("Query Sessions Error: ", e)
  }
}

const selectGame = async (game: Game) => {
  selected_game.value = game

  await fetchSessions(game.id)
}

</script>

<template>
  <div>
    <div v-if="selected_game">
      {{ selected_game }}

      <div class="flex-inline justify-between w-80% my-5">

        <ArrowLeftCircleIcon class="d-icon-6" @click="selected_game = undefined" />

        <ArrowPathIcon class="d-icon-6" @click="fetchSessions(selected_game.id)" />

        <DeltButton class="d-button-green" @click="navigateTo(`/create/${selected_game.id}`)">
          Create Session
        </DeltButton>

      </div>
      <h2 class="my-3">
        Sessions
      </h2>

      <table>
        <tr>
          <th class="px-4">
            Id
          </th>
          <th class="px-4">
            Players
          </th>
        </tr>
        <tr v-for="[id, session] of Object.entries(sessions).filter(value => value[1].game_id == selected_game?.id)"
          :key="id" class="d-button-emerald" @click="navigateTo(`/games/${id}`)">
          <td class="px-4">
            {{ id }}
          </td>
          <td class="px-4">
            {{ `${session.players}/${selected_game.config.player_limit}` }}
          </td>
        </tr>
      </table>
    </div>
    <div v-else>

      <div class="flex-inline justify-between w-80%">
        <ArrowPathIcon class="d-icon-6" @click="refreshGames()" />

        <DeltButton class="d-button-green">
          <NuxtLink to="/games/create">
            Create Game
          </NuxtLink>
        </DeltButton>
      </div>

      <table class="w-80% my-5">
        <tr>
          <th class="px-4">
            Game Id
          </th>
          <th class="px-4">
            Creator
          </th>
          <th class="px-4">
            Created At
          </th>
        </tr>
        <div v-for="game of games" :key="game.id" @click="selectGame(game)">
          <tr class="d-button-green">
            <td class="px-4">
              {{ game.id }}
            </td>
            <td class="px-4">
              {{ game.creator }}
            </td>
            <td class="px-4">
              {{ game.created_at }}
            </td>
          </tr>
        </div>
      </table>
    </div>
  </div>
</template>

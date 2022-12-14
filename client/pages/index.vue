<!-- eslint-disable camelcase -->
<script setup lang="ts">

import { Ref } from "vue"

import { SessionView } from "~~/types/server"

const { $websocket, $manager } = useNuxtApp()

const connection = await $websocket?.connect()

const sessions: Ref<{ [id: string]: SessionView }> = ref(connection && connection.sessions ? connection.sessions : {})
const games = ref(await $manager?.get())

const visable = ref(false)

const refresh = async () => {
  try {
    console.log("fetching sessions")
    sessions.value = await $websocket.connection?.get() || {}
    console.log("retrieved sessions")
    console.log("fetching games")
    games.value = await $manager?.get()
  } catch (e) {
    console.error("Query Error: ", e)
  }
}

// eslint-disable-next-line camelcase
const join = async (session_id: string) => {
  try {
    console.log("joining session: ", session_id)
    visable.value = true
    const init_state = await $websocket.connection?.join(session_id)
    if (init_state) {
      $manager.initilize(init_state)
    } else {
      visable.value = false
    }
  } catch (e) {
    console.error("Join Error: ", e)
    visable.value = false
  }
}

const createGame = async () => {
  try {
    const game = await $manager.create("vans dungeon")
    console.log(game)
  } catch (e) {
    console.error(e)
  }
}

const createSession = async () => {
  try {
    console.log("creating session")
    await $websocket.connection?.create({ game_id: "vans dungeon" })
  } catch (e) {
    console.error("Create Error: ", e)
  }
}

</script>

<template>
  <div class="w-100% h-100%">
    <DeltInstance v-if="visable" />
    <div v-else>
      <DeltButton class="d-button-green" @click="refresh()">
        Refresh
      </DeltButton>
      <DeltButton class="d-button-green" @click="createGame()">
        Create
      </DeltButton>

      <h1>
        Games
      </h1>
      <table>
        <tr>
          <th class="px-4">
            Game Id
          </th>
          <th class="px-4">
            Creator
          </th>
          <th class="px-4">
            Level Required
          </th>
          <th class="px-4">
            Created At
          </th>
        </tr>
        <tr v-for="game of games" :key="game.id" class="d-button-green" @click="createSession()">
          <td class="px-4">
            {{ game.id }}
          </td>
          <td class="px-4">
            {{ game.creator }}
          </td>
          <td class="px-4">
            {{ game.lvl_required }}
          </td>
          <td class="px-4">
            {{ game.created_at }}
          </td>
        </tr>
      </table>

      <h1>
        Sessions
      </h1>
      <table>
        <tr>
          <th class="px-4">
            Game Id
          </th>
          <th class="px-4">
            Id
          </th>
          <th class="px-4">
            Players
          </th>
          <th class="px-4">
            Password Protected
          </th>
        </tr>
        <tr v-for="[id, session] of Object.entries(sessions)" :key="id" class="d-button-green" @click="join(id)">
          <td class="px-4">
            {{ session.game_id }}
          </td>
          <td class="px-4">
            {{ id }}
          </td>
          <td class="px-4">
            {{ session.players }}
          </td>
          <td class="px-4">
            {{ session.password }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">

import { Ref } from 'vue';
import { Pool, PoolConfig } from '~~/types/contracts';
import { GameConfig } from '~~/types/db';
import { SessionConfig } from '~~/types/server';
import { v4 } from 'uuid';

const route = useRoute()
const router = useRouter()

const user = await useUser()

if (!user) {
  router.push("/login")
}

const game_id = ref(route.params.game_id as string | undefined)

const { $near, $websocket, $manager } = useNuxtApp()

if (game_id.value && !$websocket?.connection) {
  await $websocket?.connect()
}

const useable_pools: Ref<{ [id: string]: Pool }> = ref({})

const get_pools = async () => {
  useable_pools.value = {}
  if ($near?.wallet.isSignedIn()) {
    for (const [id, pool] of Object.entries(await $near?.deltd.get_pools($near?.wallet.getAccountId()))) {
      if (!pool.active && !pool.resolved) {
        useable_pools.value[id] = pool
      }
    }
  }
}

await get_pools()

const select = ref(true)

const create_pool: PoolConfig = reactive({ pool_id: v4().replaceAll("-", ""), pool_results: [], required_xp: 0 })

const createPool = async () => {
  try {
    if ($near.wallet.isSignedIn()) {

      console.log("creating pool")

      const res = await $near?.deltd.create_pool(create_pool)

      console.log(res)

      await get_pools()
    }
  } catch (e) {
    console.error("Create Pool Error: ", e)
  }
}

const selected_pool: Ref<string | undefined> = ref(undefined)
const whitelist: Ref<string[]> = ref([])
const whitelist_entry: Ref<string | undefined> = ref(undefined)

const addToWhitelist = async () => {

  if (whitelist_entry.value && !whitelist.value.find(value => value == whitelist_entry.value)) {

    try {
      const res = await useUser(whitelist_entry.value)

      if (res) {
        whitelist.value.push(res.id)
        whitelist_entry.value = undefined
      }
    } catch (error) {
      console.log(error)
    }

  }
}

const password: Ref<string | undefined> = ref(undefined)

const createSession = async () => {

  const create_session: SessionConfig = {
    game_id: game_id.value as string,
    pool_id: selected_pool.value,
    whitelist: whitelist.value.length > 0 ? whitelist.value : undefined,
    password: password.value,
  }

  if ($websocket?.connection) {
    const res = await $websocket?.connection.create(create_session as SessionConfig)

    if (res) {
      router.push(`/${user!.id}/${res.session_id}`)
    }
  } else {
    await $websocket?.connect()
  }
}

const create_game_id: Ref<string | undefined> = ref(undefined)
const create_game_config: GameConfig = reactive({ lvl_required: 0, player_limit: 1, teams: 1 })
const create_game_expiry: Ref<Date | undefined> = ref(undefined)

const createGame = async () => {
  try {
    const res = await $manager?.create(create_game_id.value as string, create_game_config, create_game_expiry.value)
    if (res) {
      game_id.value = res.id
    }
  } catch (e) {
    console.log(e)
  }
}

</script>

<template>
  <div>
    <div v-if="!game_id">
      <input v-model="create_game_id" placeholder="game id" type="text" class="flex m-2" required="true" />
      <input v-model="create_game_expiry" placeholder="expiry date" type="datetime" class="flex m-2" />
      <input v-model="create_game_config" />

      <DeltButton class="d-button-green" @click="createGame()">
        Create Game
      </DeltButton>
    </div>
    <div v-else>

      <h1 class="my-5">
        Game ID: {{ game_id }}
      </h1>

      <div class="block">
        <div v-if="whitelist.length > 0" class="flex-inline justify-around">
          <div v-for="i in whitelist.length" class="flex-inline justify-around">
            {{ whitelist[i] }}
            <DeltButton class="d-button-emerald" @click="whitelist.splice(i, 1)">
              Remove
            </DeltButton>
          </div>
          <DeltButton class="d-button-emerald" @click="whitelist = []">
            Clear
          </DeltButton>
        </div>
        <div class="flex-inline justify-around">
          <input v-model="whitelist_entry" type="text" class="flex m-2" />
          <DeltButton class="d-button-emerald" @click="addToWhitelist()">
            Add to Whitelist
          </DeltButton>
        </div>
      </div>


      <input v-model="password" type="password" class="flex m-2" />

      <DeltButton class="d-button-green" @click="createSession()">
        Create Session
      </DeltButton>

      <h1>
        Selected Stake Pool: {{ selected_pool? useable_pools[selected_pool]: "None" }}
      </h1>

      <DeltButton class="d-button-green" @click="select = !select">
        {{ select? "Create New Pool": "Select Existing Pool" }}
      </DeltButton>

      <div v-if="!select">
        {{ create_pool }}

        <input v-model="create_pool.pool_id" placeholder="Pool Id" type="text" class="flex m-2" required="true" />

        <div class="flex-inline justify-around">
          Pool Id
          <input v-model="create_pool.pool_id" :placeholder="create_pool.pool_id" type="text" class="flex m-2"
            required="true" />
        </div>

        <DeltButton class="d-button-green" @click="createPool()">
          Create Pool
        </DeltButton>
      </div>

      <table v-else>
        <tr v-for="[id, pool] of Object.entries(useable_pools)" :key="id" class="d-button-emerald"
          @click="selected_pool = id">
          <td class="px-4">
            {{ id }}
          </td>
          <td class="px-4">
            {{ pool.owner }}
          </td>
          <td class="px-4">
            {{ pool.required_stakes }}
          </td>
          <td class="px-4">
            {{ pool.required_xp }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  middleware: 'auth'
})

import { Ref } from 'vue';
import { Pool, PoolConfig } from '~~/types/contracts';
import { SessionConfig } from '~~/types/server';
import { v4 } from 'uuid';
import { Client } from '~/plugins/near.client';

const route = useRoute()

const user = await useUser()

const game_id = ref(route.params.game_id as string)

const { $near } = useNuxtApp() as any as { $near: Client }

const useable_pools: Ref<{ [id: string]: Pool }> = ref({})

const get_pools = async () => {
  useable_pools.value = {}

  console.log("fetching pool")

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

  try {
    const res = await useNewSession(create_session)

    if (res) {
      navigateTo(`/${user!.id}/${res.id}`)
    }

  } catch (error) {
    console.error(error)
  }
}

</script>

<template>
  <div>

    <h1 class="my-5">
      Game ID: {{ game_id }}
    </h1>

    <UserSearch />

    <div class="flex m-2">
      <input v-model="whitelist_entry" type="text" class="flex m-2 justify-around" placeholder="whitelist user" />
      <DeltButton class="d-button-emerald" @click="addToWhitelist()">
        Add to Whitelist
      </DeltButton>

      <DeltButton v-if="whitelist.length > 0" class="d-button-emerald flex m-2" @click="whitelist = []">
        Clear
      </DeltButton>
    </div>

    <ul v-if="whitelist.length > 0">
      <li v-for="(item, i) in whitelist" :key="i" class="flex-inline justify-around">
        {{ item }}
        <DeltButton class="d-button-emerald flex m-2" @click="whitelist.splice(i, 1)">
          Remove
        </DeltButton>
      </li>
    </ul>

    <input v-model="password" type="password" class="flex m-2" placeholder="password" />

    <DeltButton class="d-button-green" @click="createSession()">
      Create Session
    </DeltButton>

    <h1>
      Selected Stake Pool: {{ selected_pool ? useable_pools[selected_pool] : "None" }}
    </h1>

    <DeltButton class="d-button-green" @click="select = !select">
      {{ select ? "Create New Pool" : "Select Existing Pool" }}
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
</template>

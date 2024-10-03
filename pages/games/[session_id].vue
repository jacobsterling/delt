<!-- eslint-disable camelcase -->
<script setup lang="ts">

import { Ref } from "vue"
import { Client } from "~/plugins/near.client";
import { Character, Token } from "~~/types/contracts"
import { Session } from "~~/types/db";

const route = useRoute()

const { $near } = useNuxtApp() as any as { $near: Client }

definePageMeta({
  middleware: 'auth',
})

const session_id = route.params.session_id as string

const fetchSession = async () => {
  try {

    const res = (await useSession(session_id)).session as Session

    if (!res) {
      navigateTo("/404")
    }

    return res

  } catch (e: any) {
    navigateTo("/404")
  }
}

const session = await fetchSession() as Session

const user = await useUser()

const pool = session.pool_id ? await $near?.deltd.get_pool(session!.pool_id) : undefined

const accounts = await useAccounts(user!.id)

const characters: Ref<{ [account_id: string]: Character }> = ref({})

for (const account of accounts) {
  characters.value[account.account_id] = (await $near.deltd.get_character(account.account_id))
}

const restricted_to: Ref<string[]> = ref([])

const status = ref(true)

const selected_account: Ref<string | undefined> = ref(undefined)

const registered_ft = ref(0)
const staked_ft = ref(0)

const registered_stakes: Ref<Token[]> = ref([])
const staked_stakes: Ref<Token[]> = ref([])

const selectAccount = async (account_id: string) => {
  if (restricted_to.value.includes(account_id) || restricted_to.value.length < 1) {
    selected_account.value = account_id
    const registered: string[] = []
    const staked: string[] = []
    for (const [{ token }, pool_id] of (await $near?.deltd.get_stakes(selected_account.value)).filter(value => value[1] === session!.pool_id || value[1] === undefined)) {
      if (token.balance && token.token_id) {
        (pool_id ? staked : registered).push(token.token_id)
      } else if (token.balance) {
        (pool_id ? staked_ft : registered_ft).value = token.balance
      }
    }
    registered_stakes.value = (await $near?.deltmt.mt_token(registered)).filter(token => token) as Token[]
    staked_stakes.value = (await $near?.deltmt.mt_token(staked)).filter(token => token) as Token[]
  }
}

await selectAccount($near?.wallet.getAccountId() || accounts[0].account_id)

const password_input = ref(undefined)
const stake_amount = ref(undefined)
const selected_result = ref(selected_account.value)
const receivers: Ref<{ [result: string]: string }> = ref({})

const join = async () => {
  if (selected_account.value !== $near?.wallet.getAccountId() && pool) {
    $near?.wallet.requestSignIn({ contractId: selected_account.value })
  } else {
    navigateTo(`${user!.id}/${session_id}`)
  }
}

const stake = async (result: string, receivers: { [result: string]: string }, token_id?: string, balance?: number) => {
  status.value = false
  if (selected_account.value && pool) {
    const res = await $near?.deltd.stake({ contract_id: $near?.deltd.contract.contractId, token: { balance, token_id } }, selected_account.value, result, session!.pool_id as string, receivers)
    console.log(res)
  }
  status.value = true
}
const unstake = async (token_id?: string, balance?: number) => {
  status.value = false
  if (selected_account.value) {
    const res = await $near?.deltd.unstake({ contract_id: $near?.deltd.contract.contractId, token: { balance, token_id } }, selected_account.value)
    console.log(res)
  }
  status.value = true
}

</script>

<template>
  <div>
    {{ session }}
    <div v-if="pool">
      {{ pool }}
      Results
      <div v-for="result of Object.keys(pool.required_stakes).concat(selected_account ? [selected_account] : [])"
        :key="result" class="inline-flex justify-center">
        <DeltButton class="d-button-emerald" @click="() => {
          selected_result = result
          receivers = {}
        }">
          {{ result }}
        </DeltButton>
      </div>
      Select Receivers
      {{ receivers }}
      <div
        v-for="other_result of Object.keys(pool?.required_stakes).concat(selected_account ? [selected_account] : []).filter(result => result !== selected_result)"
        :key="other_result" class="inline-flex justify-center">
        <DeltButton v-for="receiver in Object.keys(pool.required_stakes[other_result])"
          @click="receivers[other_result] = receiver">
          {{ receiver }}
        </DeltButton>
      </div>
    </div>
    <div class="inline-flex justify-center">
      <input v-if="session!.password" v-model="password_input" placeholder="password" type="text" class="flex m-2"
        required="true">
      <DeltButton class="d-button-green" @click="join()">
        Join
      </DeltButton>
    </div>
    <div v-for="[account_id, character] of Object.entries(characters)" :key="account_id"
      class="inline-flex justify-center" @click="selectAccount(account_id)">
      {{ character }}
      <div v-if="pool && selected_result">
        <h1>
          Staked
        </h1>
        <TokenCard v-for="staked in staked_stakes" :key="staked.slug" class="inline-flex justify-center" :item="stake">
          <input v-model="stake_amount" :placeholder="`${staked.amount}`" type="number" class="flex m-2" required="true">
          <DeltButton v-if="!pool?.active" @click="unstake(staked.tokenId, stake_amount)">
            Unstake
          </DeltButton>
        </TokenCard>
        <h1>
          Registered
        </h1>
        <TokenCard v-for="token in registered_stakes" :key="token.slug" :item="token" class="inline-flex justify-center">
          <input v-model="stake_amount" :placeholder="`${token.amount}`" type="number" class="flex m-2" required="true">
          <DeltButton @click="stake(selected_result as string, receivers, token.tokenId, stake_amount)">
            Stake
          </DeltButton>
        </TokenCard>
      </div>
    </div>
  </div>
</template>

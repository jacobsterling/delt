<!-- eslint-disable camelcase -->
<script setup lang="ts">import { Token } from "~~/types/contracts"

const route = useRoute()
const router = useRouter()

const { $near } = useNuxtApp()

const profile = await useUser(route.params.username as string)

const user = await useUser()

if (!profile) {
  router.push("/404")
}

const LIMIT = 5
const FROM = ref(0)
const TO = ref(LIMIT)
const status = ref(true)

const restricted = profile!.id !== user?.id

const accounts = await useAccounts(profile!.id)

const tokens_by_account: { [account_id: string]: Token[] } = reactive({})

for (const account of accounts) {
  tokens_by_account[account.account_id] = await $near?.deltmt.mt_tokens_for_owner(account.account_id, FROM.value, LIMIT)
}

const selected_account = ref(accounts[0].account_id)

const loadTokens = async () => {
  FROM.value = TO.value + 1
  TO.value = FROM.value + LIMIT
  const newtokens = await $near.deltmt.mt_tokens_for_owner(selected_account.value, FROM.value, LIMIT)
  tokens_by_account[selected_account.value].concat(newtokens)
  if (tokens_by_account[selected_account.value].length < LIMIT) {
    status.value = false
  }
}

</script>

<template>
  <div>
    {{ profile }}
    <div class="inline-flex justify-center">
      <DeltButton v-for="id of Object.keys(tokens_by_account.value)" :key="id" @click="selected_account = id">
        {{ id }}
      </DeltButton>
    </div>

    <TokenCard v-for="token in tokens_by_account[selected_account]" :key="token.slug" :item="token">
      <TokenPurchase :item="token" />
    </TokenCard>

    <footer class="w-100% justify-center">
      <DeltButton v-if="status" class="d-button-cyan flex" @click="loadTokens">
        Load more items
      </DeltButton>
    </footer>
  </div>
</template>

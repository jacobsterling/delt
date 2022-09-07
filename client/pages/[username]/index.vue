<script setup lang="ts">

import { Token } from "../../plugins/contract.client"

const client = useSupabaseClient()
const route = useRoute()

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()
const profile = await useUsername(route.params.username)

const { data: tokens } = await client.from("tokens").select("*").eq("owner", profile.account)

const removeListing = async (token: Token) => {
  await contractRef.removeListing(wallet, token)
}

</script>

<template>
  <div class="inline-flex justify-center">
    <TokenCard v-for="token in tokens" :key="token.slug" :item="token">
      <li>
        <TokenPurchase :item="token" />
      </li>
      <li>
        <DeltButton class="d-button-sky p-1 flex" @click="removeListing(token)">
          <div class="flex-inline justify-between align-center">
            <ExclamationIcon class="d-icon-6" />
            <div class="flex text-center">
              Remove Listing
            </div>
          </div>
        </DeltButton>
      </li>
    </TokenCard>
  </div>
</template>

<script setup lang="ts">

const client = useSupabaseClient()

const LIMIT = 5
const FROM = ref(0)
const TO = ref(LIMIT)
const status = ref(true)

const { data: tokens } = await client.from("tokens").select("*").eq("listed", true).neq("owner", undefined).order("createdAt").range(FROM.value, TO.value)

const loadtokens = async () => {
  FROM.value = TO.value + 1
  TO.value = FROM.value + LIMIT
  const { data: newtokens } = await client.from("tokens").select("*").eq("listed", true).neq("owner", undefined).order("createdAt").range(FROM.value, TO.value)
  tokens.concat(newtokens)
  if (tokens.length < LIMIT) {
    status.value = false
  }
}

</script>

<template>
  <div class="justify-center flex-wrap w-90%">
    <TokenCard v-for="token in tokens" :key="token.slug" :item="token">
      <TokenPurchase :item="token" />
    </TokenCard>
    <footer class="w-100% justify-center">
      <DeltButton v-if="status" class="d-button-cyan flex" @click="loadtokens">
        Load more items
      </DeltButton>
    </footer>
  </div>
</template>

<script setup lang="ts">

import { NuxtError } from '#app';
import { Ref } from 'vue';
import useSession from '~~/composables/useSession';

const route = useRoute()
const router = useRouter()
const user = await useUser()

const username = route.params.username as string

if (!user || user.id != username) {
  router.back()
}

const session_id = route.params.session_id as string

const { session, player } = await useSession(session_id, username)

if (!session) {
  router.push(`/404`)
}

if (!player) {
  router.push(`/games/${session_id}`)
}

</script>

<template>
  <DeltInstance />
</template>

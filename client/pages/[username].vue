<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()
const users = await client.from("usernames").select().eq("username", route.params.username)
const uid = users.data.id
const designs = await client.from("designs").select().eq("created_by", uid)
const designsData = designs.data

</script>

<template>
  <div>{{ route.username }}</div>
  <div v-for="design in designsData" class="mx-auto my-15 px-4 dark:text-white w-90% max-w-screen-xl">
    <DesignCard :design="design" />
  </div>
</template>

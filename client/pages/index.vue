<script setup lang="ts">

const user = useSupabaseUser()
const client = useSupabaseClient()
const designs = await client.from("designs")
</script>

<template>
  <div v-for="design in designs.data" class="mx-auto px-4 dark:text-white max-w-screen-xl">
    <DesignCard :design="design" />
  </div>
</template>

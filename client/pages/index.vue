<script setup lang="ts">

const user = useSupabaseUser()
const client = useSupabaseClient()
const designs = await client.from("designs")
</script>

<template>
  <div v-for="design in designs" class="mx-auto px-4 dark:text-white max-w-screen-xl">
    {{ design }}
    <!-- <DesignCard :design="design" /> -->
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
</script>

<template>
  <div class="mx-auto px-4 dark:text-white max-w-screen-xl">
    {{ user?.email }}
    {{ user?.email_confirmed_at }}
  </div>
</template>

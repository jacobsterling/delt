<script setup lang="ts">
const client = useSupabaseClient()
const route = useRoute()
console.log(route)
const design = await client.from("designs").select().eq("slug", route.params.slug)
</script>

<template>
  <div>
    {{ design.data }}
  </div>
</template>

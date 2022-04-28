<script setup lang="ts">
const client = useSupabaseClient()
const route = useRoute()
const design = await client.from("designs").select("*").eq("slug", route.params.slug)
console.log(design)
</script>

<template>
  <div>
    {{ design.data }}
  </div>
</template>

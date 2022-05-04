<script setup lang="ts">
const client = useSupabaseClient()
const route = useRoute()
const { data: design } = await client.from("designs").select("*").eq("published", true).eq("slug", route.params.slug)
</script>

<template>
  <div>
    design
  </div>
</template>
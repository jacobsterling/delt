<script setup lang="ts">
const props = defineProps({
  design: {
    default: undefined,
    required: true,
    type: String,
    validator: prop => typeof prop === "string"
  },
  visible: {
    default: true,
    required: false,
    type: Boolean,
    validator: prop => typeof prop === "boolean"
  }
})

const client = useSupabaseClient()
const owned_by = await client.from("usernames").select("id, username").eq("id", props.design.owned_by).single()
const created_by = await client.from("usernames").select("id, username").eq("id", props.design.created_by).single()

</script>

<template>
  <div class="p-2 mx-1 my-0 shadow-2xl w-30%">
    <h1>{{ props.design.slug }}</h1>
    <footer class="inline">
      Created by: {{ created_by.data.username }}
      Owned by: {{ owned_by.data.username }}
    </footer>
  </div>
</template>

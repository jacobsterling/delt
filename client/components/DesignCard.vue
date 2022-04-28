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
const owned_by_data = await client.from("usernames").select("id, username").eq("id", props.design.owned_by).single()
const created_by_data = await client.from("usernames").select("id, username").eq("id", props.design.created_by).single()
const created_by = created_by_data.data.username
const owned_by = owned_by_data.data.username
const slug = props.design.slug

</script>

<template>
  <NuxtLink :to="created_by / slug">
    <div class="p-2 mx-1 my-1 shadow-2xl w-30% rounded-2xl">
      <h1>{{ props.design.slug }}</h1>
      <!-- <img src="~/assets/baki.jpg" class="w-100%" /> -->
      <footer class="text-xs border-top my-2">
        <ul>
          <li>
            <NuxtLink :to="created_by">
              Created by: {{ created_by }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink :to="owned_by">
              Owned by: {{ owned_by }}
            </NuxtLink>
          </li>
        </ul>
      </footer>
    </div>
  </NuxtLink>
</template>

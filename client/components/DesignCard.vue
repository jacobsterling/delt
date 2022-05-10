<script setup lang="ts">

const props = defineProps({
  design: {
    default: undefined,
    required: true,
    type: Object,
    validator: prop => typeof prop === "object"
  },
  visible: {
    default: true,
    required: false,
    type: Boolean,
    validator: prop => typeof prop === "boolean"
  }
})

const created_by = await useUser(props.design.created_by)
const owned_by = await useUser(props.design.owned_by)

const client = useSupabaseClient()

const getDesignImage = (slug: string) => {
  try {
    const { data: url, error } = client
      .storage
      .from("designs")
      .getPublicUrl(`${slug}.png`)
    if (error) { throw error }
    return url.publicURL
  } catch (error) {
    console.log(error)
  }
}

const image = getDesignImage(props.design.slug)

</script>

<template>
  <div class="p-2 m-5 shadow-2xl rounded-2xl w-280px h-320px">
    <div @click="$router.push(`/${created_by.username}/${props.design.slug}`)">
      <h1>{{ props.design.slug }}</h1>
      <img :src="image" class="w-100%">
    </div>
    <footer class="text-xs border-top my-2">
      <aside class="float-right">
        <slot />
      </aside>
      <ul>
        <li>
          <NuxtLink :to="created_by.username">
            Created by: {{ created_by.username }}
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="owned_by.username">
            Owned by: {{ owned_by.username }}
          </NuxtLink>
        </li>
      </ul>
    </footer>
  </div>
</template>

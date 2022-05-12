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

const { username: createdBy } = await useUser(props.design.createdBy)
const { username: ownedBy } = await useUser(props.design.ownedBy)

const client = useSupabaseClient()

const getDesignImage = (slug: string) => {
  try {
    const { data: url, error } = client
      .storage
      .from("designs")
      .getPublicUrl(`${slug}.jpg`)
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
    <div @click="$router.push(`/${createdBy}/${props.design.slug}`)">
      <h1>{{ props.design.slug }}</h1>
      <img :src="image" class="w-100%">
    </div>
    <footer class="text-xs border-top my-2">
      <aside class="float-right">
        <slot />
      </aside>
      <ul>
        <li>
          <NuxtLink :to="createdBy">
            Created by: {{ createdBy }}
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="ownedBy">
            Owned by: {{ ownedBy }}
          </NuxtLink>
        </li>
      </ul>
    </footer>
  </div>
</template>

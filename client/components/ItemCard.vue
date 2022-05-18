<script setup lang="ts">
const props = defineProps({
  item: {
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

const { username: owner, accountCompact: ownerAcc, type: ownerType, imageURL: ownerPp, level: ownerLvl } = await useAccount(props.item.owner)
const client = useSupabaseClient()

const getItemImage = (slug: string) => {
  try {
    const { data: url, error } = client
      .storage
      .from("items")
      .getPublicUrl(`${slug}.png`)
    if (error) { throw error }
    return url.publicURL
  } catch (error) {
    console.log(error)
  }
}

const image = getItemImage(props.item.slug)

</script>

<template>
  <div class="p-2 m-5 flex-block shadow-2xl rounded-2xl w-280px" @click="router.push(`/${owner}/${item.slug}`)">
    <img :src="image" height="200">
    <footer class="text-xs border-top my-1 flex justify-around content-center">
      <ul class="grid justify-items-start">
        <li class="text-base">
          <h1>{{ props.item.slug }}</h1>
        </li>
        <li>
          <NuxtLink :to="owner">
            <div class="flex-inline">
              Owned by:
              <img :src="ownerPp || '../../assets/knight-helmet.svg'" size="5px" class="d-icon-5 flex">
              {{ owner || ownerAcc }}
              <div class="d-icon-4 flex mx-1">
                {{ ownerLvl || "??" }}
              </div>
            </div>
          </NuxtLink>
        </li>
      </ul>
      <aside class="flex float:right">
        <slot />
      </aside>
    </footer>
  </div>
</template>

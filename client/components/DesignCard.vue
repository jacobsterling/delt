<script setup lang="ts">
import { BadgeCheckIcon } from "@heroicons/vue/solid"

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

const { username: createdBy, accountCompact: createdByAcc, type: createdByType, imageURL: createdByPp } = await useAccount(props.design.createdBy)
const { username: ownedBy, accountCompact: ownedByAcc, type: ownedByType, imageURL: ownedByPp } = await useAccount(props.design.ownedBy)

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

const createdByVerified = ref<Boolean>(false)
const ownedByVerified = ref<Boolean>(false)

if (createdByType) { createdByVerified.value = true }
if (ownedByType) { ownedByVerified.value = true }

</script>

<template>
  <div class="p-2 m-5 flex-block shadow-2xl rounded-2xl w-280px">
    <div @click="$router.push(`/${createdBy}/${props.design.slug}`)">
      <h1>{{ props.design.slug }}</h1>
      <!-- <img :src="image" height="200"> -->
    </div>
    <footer class="text-xs border-top my-2 flex justify-around">
      <ul>
        <li class="flex my-1">
          <NuxtLink :to="createdBy">
            <div class="flex-inline">
              Created by:
              <img :src="createdByPp || '../../assets/knight-helmet.svg'" size="5px" class="d-icon-5 flex">
              {{ createdBy || createdByAcc }}
              <BadgeCheckIcon v-if="createdByVerified" class="d-icon-4 flex blue mx-1" />
            </div>
          </NuxtLink>
        </li>
        <li class="flex my-1">
          <NuxtLink :to="ownedBy">
            <div class="flex-inline">
              Owned by:
              <img :src="ownedByPp || '../../assets/knight-helmet.svg'" size="5px" class="d-icon-5 flex">
              {{ ownedBy || ownedByAcc }}
              <BadgeCheckIcon v-if="ownedByVerified" class="d-icon-4 flex blue mx-1" />
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

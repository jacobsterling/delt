<script setup lang="ts">
const props = defineProps({
  token: {
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

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()

const { username: owner, imageURL: ownerPp, level: ownerLvl } = await useAccount(props.token.owner)

const client = useSupabaseClient()

const router = useRouter()

const getItemImage = (slug: string) => {
  try {
    const { data: url, error } = client
      .storage
      .from("tokens")
      .getPublicUrl(`${slug}.svg`)
    if (error) { throw error }
    console.log(url.publicURL)
    return url.publicURL
  } catch (error) {
    console.log(error)
  }
}

const image = getItemImage(props.token.slug)
const tokenURI = ref<string>(undefined)
const status = ref<string>("get URI")

const getURI = async () => {
  try {
    tokenURI.value = await contractRef.readDeltItems(wallet.provider).tokenURI(props.token.tokenId)
  } catch (Error) {
    console.log(Error)
    status.value = "Unminted"
  }
  window.open(tokenURI.value)
}

</script>

<template>
  <div class="p-2 m-5 flex-block shadow-2xl rounded-2xl w-280px">
    <img :src="image" height="200" @click="router.push(`/${owner}/${props.token.slug}`)">
    <footer class="text-xs border-top my-1 flex justify-around content-center">
      <ul class="grid justify-tokens-start">
        <li class="text-base">
          <h1>{{ props.token.slug }}</h1>
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
        <li>
          <DeltButton class="d-button-rose" @click="getURI">
            {{ status }}
          </DeltButton>
        </li>
      </ul>
      <aside class="flex float:right">
        <ul v-if="wallet" class="grid justify-tokens-end my-2">
          <slot />
        </ul>
      </aside>
    </footer>
  </div>
</template>

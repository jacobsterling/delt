<script setup lang="ts">
import { Attr, Stat } from "../plugins/contract.client"

const client = useSupabaseClient()
const router = useRouter()

const { $wallet: wallet } = useNuxtApp()

const loadingU = ref<Boolean>(false)

const upload = async () => {
  loadingU.value = true
  const { error: ImageError } = await client
    .storage
    .from("assets")
    .upload(`${useSlug(name.value)}.jpg`, file.value, {
      cacheControl: "3600",
      upsert: false
    })
  if (ImageError) { throw new Error(ImageError.message) }
  const { error: itemError } = await client
    .from("unminted")
    .insert([
      {
        createdBy: wallet.account,
        name: name.value,
        slug: useSlug(name.value),
        type: _type.value,
        upgradable: upgradable.value,
        attributes: attributes.value,
        supply: supply.value,
        burned: false
      }
    ])
  if (itemError) { throw new Error(itemError.message) }
  router.push(`/mint/${useSlug(name.value)}`)
  // } catch (Error) { console.log(Error) } finally { loadingU.value = false }
  loadingU.value = false
}

const name = ref<string>(undefined)
const _type = ref<string>(undefined)
const upgradable = ref<boolean>(false)

const attributes = ref<Attr[]>([])

const eAttribute: Attr = {
  attrKey: undefined,
  stats: []
}

let stats: Stat[] = []

const attribute = ref<Attr>({
  attrKey: undefined,
  stats: []
})

const addAttr = () => {
  attributes.value.push({
    attrKey: attrKey.value,
    stats
  })
  stats = []
  attribute.value = eAttribute
}

const addStat = () => {
  stats.push({
    statKey: statKey.value,
    tier: 0,
    trait: trait.value,
    value: value.value
  })
  attribute.value.stats.push({
    statKey: statKey.value,
    tier: 0,
    trait: trait.value,
    value: value.value
  })
}

const supply = ref<number>(1)
const image = ref<Object>(undefined)
const file = ref<Blob>(undefined)

const attrKey = ref<string>()
const statKey = ref<string>()
const trait = ref<string>()
const value = ref<number>()

const stat = ref<Stat>({
  statKey: statKey.value,
  tier: 0,
  trait: trait.value,
  value: value.value
})

const onImageUpload = (e: any) => {
  file.value = e.target.files[0]
  const reader = new FileReader()
  reader.onload = (event) => {
    image.value = event.target.result
  }
  reader.readAsDataURL(file.value)
}

</script>

<template>
  <div class="flex-block">
    <input v-model="name" placeholder="token name" type="text" class="flex m-2">
    <input v-model="_type" placeholder="token type" type="text" class="flex m-2">
    <input v-model="upgradable" placeholder="token name" type="checkbox" class="flex m-2">
    <input v-model="supply" placeholder="supply" type="number" class="flex m-2">
    <img ref="img" :src="image" height="100px" width="150px">
    <input ref="fileInput" type="file" class="flex m-2" @change="onImageUpload">
    {{ attributes }}
    <DeltButton class="d-button-pink" @click="addAttr()">
      Add Attribute
    </DeltButton>
    {{ attribute }}
    <input v-model="attrKey" type="text" placeholder="attribute key">
    <DeltButton class="d-button-pink" @click="addStat()">
      Add Stat
    </DeltButton>
    {{ stat }}
    <input v-model="statKey" type="text" placeholder="stat key">
    <input v-model="trait" type="text" placeholder="trait">
    <input v-model="value" type="number" placeholder="value">
    <button class="d-button-emerald" @click="upload">
      Upload
    </button>
  </div>
</template>

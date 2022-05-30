<script setup lang="ts">
const client = useSupabaseClient()
const router = useRouter()

const { $wallet: wallet, $contractRef: contractRef } = useNuxtApp()

const loadingU = ref<Boolean>(false)

const upload = async () => {
  loadingU.value = true
  try {
    const { error: ImageError } = await client
      .storage
      .from("items")
      .upload(`${useSlug(name.value)}.jpg`, file.value, {
        cacheControl: "3600",
        upsert: false
      })
    if (ImageError) { throw new Error(ImageError.message) }
    const { error: itemError } = await client
      .from("items")
      .insert([
        {
          createdBy: wallet.account,
          description: description.value,
          name: name.value,
          slug: useSlug(name.value)
        }
      ])
    router.push(`/${wallet.profile.userSlug}`)
    if (itemError) { throw new Error(itemError.message) }
  } catch (Error) { console.log(Error) } finally { loadingU.value = false }
}

const name = ref<string>(undefined)
const image = ref<Object>(undefined)
const file = ref<Blob>(undefined)
const description = ref<string>(undefined)

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
    <input class="flex-block">
    <input v-model="name" placeholder="Design name" type="text" class="flex m-2">
    <img ref="img" :src="image" height="100px" width="150px">
    <input ref="fileInput" type="file" class="flex m-2" @change="onImageUpload">
    <input v-model="description" placeholder="Description" type="text" class="flex m-2">
    <button class="d-button-emerald" @click="upload">
      Upload
    </button>
  </div>
</template>

<script setup lang="ts">

const client = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const loadingU = ref<Boolean>(false)

const upload = async () => {
  loadingU.value = true
  try {
    const { error: ImageError } = await client
      .storage
      .from("designs")
      .upload(`${slug.value}.jpg`, file.value, {
        cacheControl: "3600",
        upsert: false
      })
    if (ImageError) { throw new Error(ImageError.message) }
    const { error: designError } = await client
      .from("designs")
      .insert([
        {
          createdBy: user.value.id,
          description: description.value,
          ownedBy: user.value.id,
          slug: slug.value
        }
      ])
    const { username } = await useUser(user.value.id)
    router.push(`/${username}`)
    if (designError) { throw new Error(designError.message) }
  } catch (Error) { console.log(Error) } finally { loadingU.value = false }
}

const slug = ref<string>(undefined)
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
    <input v-model="slug" placeholder="Design name" type="text" class="flex m-2">
    <img ref="img" :src="image" height="100px" width="150px">
    <input ref="fileInput" type="file" class="flex m-2" @change="onImageUpload">
    <input v-model="description" placeholder="Description" type="text" class="flex m-2">
    <button class="d-button-emerald" @click="upload">
      Upload
    </button>
  </div>
</template>

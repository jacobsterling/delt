<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const user = useSupabaseUser()

const { username } = await useUser(user.value.id)

const { data: userData } = await client.from("usernames").select("*").eq("username", route.params.username).single()

const tab = ref<string>("Published")

const { data: designsP } = await client.from("designs").select("*").eq("published", true).eq("created_by", userData.id)
const { data: designsU } = await client.from("designs").select("*").eq("published", false).eq("created_by", userData.id)
const { data: designsO } = await client.from("designs").select("*").eq("published", true).eq("owned_by", userData.id)
</script>

<template>
  <div class="inline-flex justify-left">
    <button v-if="route.params.username === username" @click="router.push(`/${username}/publish`)"
      class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm">
      Publish Designs
    </button>
    <button @click="tab = 'Published'" class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm">
      Published
    </button>
    <button @click="tab = 'Owned'" class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm">
      Owned
    </button>
    <button @click="tab = 'Unpublished'" class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm">
      Unpublished
    </button>
  </div>
  <div v-if="tab === 'Published'" class="inline-flex justify-center">
    <DesignCard v-for="design in designsP" :design="design" />
  </div>
  <div v-if="tab === 'Owned'" class="inline-flex justify-center">
    <DesignCard v-for="design in designsO" :design="design" />
  </div>
  <div v-if="tab === 'Unpublished'" class="inline-flex justify-center">
    <DesignCard v-for="design in designsU" :design="design" />
  </div>
</template>

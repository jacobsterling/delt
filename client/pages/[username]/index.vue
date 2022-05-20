<script setup lang="ts">

const client = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const user = useSupabaseUser()

const { username } = await useUser(user.value.id)

if (!username) { router.push("/404") }

const { data: userData } = await client.from("usernames").select("*").eq("username", route.params.username).single()

const tab = ref<string>("Published")

const { data: designsP } = await client.from("designs").select("*").eq("published", true).eq("created_by", userData.id)
const { data: designsU } = await client.from("designs").select("*").eq("published", false).eq("created_by", userData.id)
const { data: designsO } = await client.from("designs").select("*").eq("published", true).eq("owned_by", userData.id)
</script>

<template>
  <div class="inline-flex justify-left">
    <button
      v-if="route.params.username === username"
      class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm"
      @click="router.push(`/${username}/publish`)"
    >
      Publish Designs
    </button>
    <button class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm" @click="tab = 'Published'">
      Published
    </button>
    <button class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm" @click="tab = 'Owned'">
      Owned
    </button>
    <button class="bg-red-200 hover:bg-red-400 rounded-md p-1 m-2 text-sm" @click="tab = 'Unpublished'">
      Unpublished
    </button>
  </div>
  <div v-if="tab === 'Published'" class="inline-flex justify-center">
    <DesignCard
      v-for="design in designsP"
      :key="design.id"
      :design="design"
    />
  </div>
  <div v-if="tab === 'Owned'" class="inline-flex justify-center">
    <DesignCard
      v-for="design in designsO"
      :key="design.id"
      :design="design"
    />
  </div>
  <div
    v-if="tab === 'Unpublished'"
    class="inline-flex justify-center"
  >
    <DesignCard
      v-for="design in designsU"
      :key="design.id"
      :design="design"
    />
  </div>
</template>

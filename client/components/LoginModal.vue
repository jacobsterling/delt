<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()
const router = useRouter()

const email = ref("")
const password = ref("")

defineProps({
  visible: {
    default: true,
    required: false,
    type: Boolean,
    validator: prop => typeof prop === "boolean"
  }
})

const submit = async () => {
  const { error } = await client.auth.signIn({
    email: email.value,
    password: password.value
  })
  if (error) {
    console.log(error)
  }
}

</script>

<template>
  <div v-if="visible"
    class="fixed left-1/2 top-1/2 bg-white rounded drop-shadow-2xl max-w-xs text-center translate-x--1/2 translate-y--1/2 border border-[#2d2d2d]">
    <div class="block justify-center">
      <input v-model="email" placeholder="email" class="rounded-2xl px-4 py-2 m-4 font-size-20  text-1xl"
        @keyup.enter="submit" />
      <input v-model="password" placeholder="password" class="rounded-2xl px-4 py-2 m-4 font-size-20 text-1xl"
        @keyup.enter="submit" />
      <button class="flex-no-shrink text-white py-2 px-4 m-2 rounded bg-teal hover:bg-teal-dark " @click="submit">
        Login\
      </button>
    </div>
  </div>
</template>

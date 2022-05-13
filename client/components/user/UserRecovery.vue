<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const password = ref("")
const passwordConfirm = ref("")
const loading = ref(false)

const reset = async () => {
  try {
    if (password.value !== passwordConfirm.value) {
      throw new Error("Passwords do not match")
    }

    loading.value = true

    const { error } = await client.auth.update({
      email: user.value.email,
      password: password.value
    })

    if (error) { throw error }
  } catch (error) {
    alert(error.error_description || error.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ul class="justify-items-start">
    <li>
      <input v-model="password" placeholder="password" class="rounded-2xl px-4 py-2 m-4 font-size-20 text-1xl"
        type="password" required>
    </li>
    <li>
      <input v-model="passwordConfirm" placeholder="confirm password" required
        class="rounded-2xl px-4 py-2 m-4 font-size-20  text-1xl" type="password">
    </li>
    <li>
      <button class="border rounded-2xl px-4 py-2 m-4 font-size-20 text-1xl content-center" @click="reset">
        <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {{ loading ? "" : "Reset" }}
      </button>
    </li>
  </ul>
</template>

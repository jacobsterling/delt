<script setup lang="ts">
const client = useSupabaseClient()
const email = ref("")
const password = ref("")
const passwordConfirm = ref("")

const submit = async () => {
  if (password !== passwordConfirm) {
    console.log("passwords do not match")
  } else {
    const { error } = await client.auth.signUp({
      email: email.value,
      password: password.value
    })
    if (error) {
      console.log(error)
    } else {
      const { error } = await client.auth.signIn({
        email: email.value,
        password: password.value
      })
      if (error) {
        console.log(error)
      }
    }
  }
}

</script>

<template>
  <form @onSubmit="submit">
    <ul class="justify-items-start">
      <li>
        <input v-model="email" placeholder="email" class="rounded-2xl px-4 py-2 m-4 font-size-20  text-1xl" />
      </li>
      <li>
        <input v-model="password" placeholder="password" class="rounded-2xl px-4 py-2 m-4 font-size-20  text-1xl" />
      </li>
      <li>
        <input v-model="passwordConfirm" placeholder="confirm password"
          class="rounded-2xl px-4 py-2 m-4 font-size-20  text-1xl" />
      </li>
      <li>
        <button type="submit">
          Submit
        </button>
      </li>
    </ul>
  </form>
</template>

<style>
/* class="flex-no-shrink text-white py-2 px-4 my-2 mx-6 rounded-2xl bg-teal hover:bg-teal-dark" */
.button {
  flex: no-shrink;
  content: white;
  background: teal;
  padding-top: 2;
  padding-bottom: 2;
  padding-left: 4;
  padding-right: 4;
  margin-top: 2;
  margin-bottom: 2;
  margin-left: 6;
  margin-right: 6;
  border-radius: 1rem;
  /* hover: bg-teal-dark */
}
</style>
<script setup lang="ts">
import type { Ref } from "vue"

const usernameOrEmail = ref("")
const password = ref("")
const errors: Ref<Map<string, { message: InputValidation; }> | undefined> = ref(undefined)

definePageMeta({
  middleware: "guest"
})

async function postLoginForm() {
  try {
    await useLogin(usernameOrEmail.value, password.value)
    useRouter().back()
  } catch (e: any) {
    errors.value = useErrorMapper(e.data)
  }
}
</script>

<template>
  <div class="flex items-center justify-center px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div>
        <h2 class="text-center text-3xl font-extrabold mt-5 text-gray-900 dark:text-white">
          Sign In
        </h2>
      </div>
      <div v-if="response?.hasErrors && errors"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-3" role="alert">
        <ul class="block sm:inline">
          <li v-for="[key, value] in errors" :key="key">
            {{ value.message }}
          </li>
        </ul>
      </div>
      <form class="mt-8 space-y-6" action="#" method="POST" @submit.prevent>
        <div class="rounded-md shadow-sm -space-y-px mb-1">
          <div>
            <label for="email-address" class="sr-only">Username or Email</label>
            <input id="username" v-model="usernameOrEmail" type="email" name="username" required
              class="dark:bg-slate-500 dark:text-white dark:placeholder-white appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              :class="errors?.has('username') ? ' border-red-500' : ''" placeholder="Username">
          </div>
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input id="password" v-model="password" name="password" type="password" autocomplete="current-password"
            required
            class="dark:bg-slate-500 dark:text-white dark:placeholder-white appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
            :class="errors?.has('password') ? ' border-red-500' : ''" placeholder="Password">
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm">
            <a href="#" class="font-medium text-emerald-600 hover:text-emerald-500">
              Forgot your password?
            </a>
          </div>
        </div>
      </form>
      <button
        class="mt-5 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        @click.prevent="postLoginForm">
        <span class="absolute left-0 inset-y-0 flex items-center pl-3">
          <!-- Heroicon name: solid/lock-closed -->
          <svg class="h-5 w-5 text-emerald-500 group-hover:text-emerald-400" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clip-rule="evenodd" />
          </svg>
        </span>
        Login
      </button>
    </div>
  </div>
</template>

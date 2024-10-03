<script setup lang="ts">

import { NuxtError } from "#app";
import { Ref } from "vue"

const password: Ref<string | null> = ref(null)
const username: Ref<string | null> = ref(null)
const email: Ref<string | null> = ref(null)

const error: Ref<NuxtError | undefined> = ref(undefined)

const postRegisterForm = async () => {

  try {
    if (!username.value) {
      throw createError({ statusCode: 411, statusMessage: "Username required", data: "id" })
    }

    if (!email.value) {
      throw createError({ statusCode: 411, statusMessage: "Email required", data: "email" })
    }

    if (!password.value) {
      throw createError({ statusCode: 411, statusMessage: "Password required", data: "password" })
    }

    await useRegister(username.value, password.value, email.value)

    useRouter().replace("/login")

  } catch (e: any) {
    error.value = e
  }
}



</script>

<template>
  <div class="justify-center flex-wrap w-90%">
    <div>
      <h2 class="text-center text-3xl font-extrabold mt-5 text-gray-900 dark:text-white">
        Register
      </h2>
    </div>
    <div v-if="error && !error.data" class="bg-red-100 border border-red-400 text-red-700 px-4 py-1 rounded relative mt-3"
      role="alert">
      <ul class="block sm:inline">
        {{ error.statusMessage || "Internal Error" }}
      </ul>
    </div>
    <form class="mt-8 space-y-6" action="#" method="POST" @submit.prevent>
      <input type="hidden" name="remember" value="true">
      <div class="rounded-md shadow-sm -space-y-px mb-1">
        <label for="username" class="sr-only">Username</label>
        <input id="username" v-model="username" type="email" name="username" required
          class="dark:bg-slate-500 dark:text-white dark:placeholder-white appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
          :class="error?.data == 'id' ? ' border-red-500' : ''" placeholder="Username" @keyup.enter="postRegisterForm">
        <div v-if="error?.data == 'id'"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-1 my-2 rounded relative" role="alert">
          <ul class="block sm:inline">
            {{ error.statusMessage }}
          </ul>
        </div>
      </div>

      <div class="rounded-md shadow-sm -space-y-px mb-1">
        <label for="email-address" class="sr-only">Email address</label>
        <input id="email-address" v-model="email" name="email" type="email" autocomplete="email" required
          class="dark:bg-slate-500 dark:text-white dark:placeholder-white appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
          :class="error?.data == 'email' ? ' border-red-500' : ''" placeholder="Email address"
          @keyup.enter="postRegisterForm">
        <div v-if="error?.data == 'email'"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-1 my-2 rounded relative" role="alert">
          <ul class="block sm:inline">
            {{ error.statusMessage }}
          </ul>
        </div>
      </div>

      <div class="rounded-md shadow-sm -space-y-px mb-1">
        <label for="password" class="sr-only">Password</label>
        <input id="password" v-model="password" name="password" type="password" autocomplete="current-password" required
          class="dark:bg-slate-500 dark:text-white dark:placeholder-white appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
          :class="error?.data == 'password' ? ' border-red-500' : ''" placeholder="Password"
          @keyup.enter="postRegisterForm">
        <div v-if="error?.data == 'password'"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-1 rounded relative" role="alert">
          <ul class="block sm:inline">
            {{ error.statusMessage }}
          </ul>
        </div>
      </div>

    </form>
    <DeltButton
      class="mt-5 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      @click.prevent="postRegisterForm">
      <span class="absolute left-0 inset-y-0 flex items-center pl-3">
        <!-- Heroicon name: solid/lock-closed -->
        <svg class="h-5 w-5 text-emerald-500 group-hover:text-emerald-400" xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clip-rule="evenodd" />
        </svg>
      </span>
      Register
    </DeltButton>
  </div>
</template>

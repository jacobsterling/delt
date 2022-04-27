<script setup lang="ts">
import { DialogTitle } from "@headlessui/vue"
import { InformationCircleIcon } from "@heroicons/vue/outline"

import { DeltModal } from "#components"

const loginModal = ref<InstanceType<typeof DeltModal>>()

const open = () => {
  loginModal.value?.open()
}

defineExpose({ open })

const client = useSupabaseClient()
const email = ref("")
const loading = ref(false)
const login = async () => {
  try {
    loading.value = true
    const { error } = await client.auth.signIn({ email: email.value })
    if (error) { throw error }
  } catch (error) {
    alert(error.error_description || error.message)
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div>
    <DeltModal ref="loginModal">
      <form @submit.prevent="login">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
              <InformationCircleIcon class="h-6 w-6 text-indigo-600" aria-hidden="true" />
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full px-4 sm:px-6">
              <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900">
                Login
              </DialogTitle>
              <div class="mt-4">
                <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                  <input v-model="email" type="email" name="email" class="p-3 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md">
                </div>
              </div>
            </div>
          </div>
          <div class="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button :disabled="loading" :class="loading ? 'cursor-not-allowed' : ''" type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm">
              <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {{ loading ? "Loading" : "Send Magic Link" }}
            </button>
            <button ref="cancelButtonRef" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" @click="loginModal.close">
              Cancel
            </button>
          </div>
        </div>
      </form>
    </DeltModal>
  </div>
</template>

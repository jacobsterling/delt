<script setup lang="ts">
const client = useSupabaseClient()
defineEmits(["click"])
</script>

<template>
  <button
    class="border-[#2d2d2d] border-1 bg-white rounded-2xl px-4 py-1 font-size-20 text-1xl text-bold flex content-center"
    @click="client.auth.signOut()" v-if="$user">
    Sign out
  </button>
  <button
    class="border-[#2d2d2d] border-1 bg-white rounded-2xl px-4 py-1 font-size-20 text-1xl text-bold flex content-center"
    @click="$emit('click', $event)" v-if="!$user">
    Login
  </button>
</template>

<script setup lang="ts">
const name = ref("")
const type = ref(1)

const navigate = () => navigateTo({
  path: "/search",
  query: {
    name: name.value,
    type: type.value
  }
})

</script>

<template>
  <input
    v-model="name"
    placeholder="search"
    class="rounded-2xl px-4 py-2 font-size-20 text-1xl flex content-center"
    @submit="navigate"
  >
</template>

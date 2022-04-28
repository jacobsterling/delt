<script setup lang="ts">
import { MoonIcon, SunIcon } from "@heroicons/vue/outline"

const toggleIcon = ref(true)

const color = useColorMode({
})
function toggleDark() {
  toggleIcon.value = !toggleIcon.value
  color.value = color.value === "dark" ? "light" : "dark"
}
</script>

<template>
  <button class="!outline-none m-2" @click="toggleDark">
    <SunIcon v-if="toggleIcon" class="h-6 w-6" />
    <MoonIcon v-else class="h-6 w-6" />
  </button>
</template>

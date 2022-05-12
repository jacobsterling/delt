<script setup lang="ts">
import { CubeIcon, FireIcon, MoonIcon, SunIcon } from "@heroicons/vue/outline"

const mode = useColorMode({
  modes: {
    cold: "cold",
    warm: "warm"
  }
})
const { next } = useCycleList<typeof mode.value>(["light", "dark", "warm", "cold"], { initialValue: mode })
</script>

<template>
  <button type="button" :title="mode" @click="next()">
    <MoonIcon v-if="mode === 'dark'" class="d-icon-6" />
    <SunIcon v-else-if="mode === 'light'" class="d-icon-6" />
    <FireIcon v-else-if="mode === 'warm'" class="d-icon-6" />
    <CubeIcon v-else-if="mode === 'cold'" class="d-icon-6" />
  </button>
</template>

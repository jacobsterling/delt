<script setup lang="ts">
import { MoonIcon, SunIcon } from "@heroicons/vue/24/outline"

// CubeIcon, FireIcon,

const mode = useColorMode()

const { next } = useCycleList<typeof mode.value>(["light", "dark"], { initialValue: mode })

</script>

<template>
  <button type="button" :title="mode" @click="next()">
    <MoonIcon v-if="mode === 'dark'" class="d-icon-6" />
    <SunIcon v-else-if="mode === 'light'" class="d-icon-6" />
  </button>
</template>

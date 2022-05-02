import { defineNuxtConfig } from "nuxt"

import { DeltUnocssNuxtOptions } from "./unocss.config"

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  css: [
    "@unocss/reset/tailwind.css"
  ],
  modules: [
    "@vueuse/nuxt",
    "@nuxtjs/supabase",
    "@unocss/nuxt"
  ],
  telemetry: false,
  typescript: {
    shim: false
  },
  unocss: DeltUnocssNuxtOptions,
  vueuse: {
    ssrHandlers: true
  }
})

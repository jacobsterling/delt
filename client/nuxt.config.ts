import { defineNuxtConfig } from "nuxt"

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  build: {
    transpile: [
      "@headlessui/vue"
    ]
  },
  css: [
    "@unocss/reset/tailwind.css"
  ],
  modules: [
    "@nuxtjs/supabase",
    "@unocss/nuxt"
  ],
  telemetry: false,
  typescript: {
    shim: false
  }
})

import { defineNuxtConfig } from "nuxt"

import { DeltUnocssNuxtOptions } from "./unocss.config"

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  build: {
    transpile: ["@heroicons/vue"]
  },
  css: [
    "@unocss/reset/tailwind.css"
  ],
  modules: [
    "@vueuse/nuxt",
    "@nuxtjs/supabase",
    "@unocss/nuxt"
  ],
  runtimeConfig: {
    public: {
      API_KEY: process.env.API_KEY
    }
  },
  telemetry: false,
  typescript: {
    shim: false
  },
  unocss: DeltUnocssNuxtOptions,
  vite: {
    build: {
      assetsInlineLimit: 0 // change later
    },
    optimizeDeps: {
      exclude: ["hardhat"]
    }
  },
  vueuse: {
    ssrHandlers: true
  }
})

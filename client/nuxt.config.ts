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
  runtimeConfig: {
    public: {
      API_KEY: process.env.API_KEY,
      CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
      NFT_STORAGE_KEY: process.env.NFT_STORAGE_KEY
    }
  },
  telemetry: false,
  typescript: {
    shim: false
  },

  unocss: DeltUnocssNuxtOptions,
  vite: {
    optimizeDeps: {
      exclude: ["hardhat"]
    }
  },
  vueuse: {
    ssrHandlers: true
  }
})

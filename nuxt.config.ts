import { defineNuxtConfig } from "nuxt"

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  buildModules: [
    "@unocss/nuxt"
  ],
  modules: ["@nuxtjs/supabase"],
  supabase: {
    // Options
  },
  telemetry: false,
  typescript: {
    shim: false
  }
})

import { defineNuxtConfig } from "nuxt"

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
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

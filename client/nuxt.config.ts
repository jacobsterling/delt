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
    "@vueuse/nuxt",
    "@nuxtjs/supabase",
    "@unocss/nuxt"
  ],
  telemetry: false,
  typescript: {
    shim: false
  },
  unocss: {
    theme: {
      breakpoints: {
        sm: "640px",
        xs: "320px"
      },
      colors: {
        brand: {
          primary: "#1f6ae3" // class="bg-brand-primary"
        },
        veryCool: "#0000ff" // class="text-very-cool"
      }
    }
  }
}
)

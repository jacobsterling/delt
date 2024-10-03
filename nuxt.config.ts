import * as buffer from "buffer"

import { DeltUnocssNuxtOptions } from "./unocss.config"
// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  build: {
    transpile: ["@heroicons/vue"]
  },
  css: [
    "@unocss/reset/tailwind.css"
  ],
  imports: {
    autoImport: true,
    dirs: ["./game"]
  },
  modules: [
    "@vueuse/nuxt",
    "@unocss/nuxt"
  ],
  runtimeConfig: {
    public: {
      API_KEY: process.env.API_KEY,
      SERVER_URL: process.env.SERVER_URL
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
    define: {
      Buffer: buffer.Buffer
    },
    optimizeDeps: {
      exclude: ["hardhat"]
    }
  },
  vueuse: {
    ssrHandlers: true
  }
})

//
// "global": "globalThis"

// ethereum: ethers.providers.Web3Provider

// vueuse: {
//   ssrHandlers: true
// }

// strict: true,
// target: "ES2022",
// typeRoots: ["./node_modules/phaser/types/phaser.d.ts"],
// types: ["node"]

// allowSyntheticDefaultImports: true,
// module: "es2022",
// moduleResolution: "node",

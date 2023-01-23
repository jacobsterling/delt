/* eslint-disable vue/sort-keys */

import { mergeDeep, Preset } from "@unocss/core"
import type { UnocssNuxtOptions } from "@unocss/nuxt"
// import { variantMatcher } from "@unocss/preset-mini/utils"
import type { Theme } from "@unocss/preset-uno"
import { theme as windTheme, presetWind } from "@unocss/preset-wind"

const presetDelt = (): Preset<Theme> => {
  return {
    name: "delt-ui",
    theme: mergeDeep(windTheme, {}),
    shortcuts: [
      {
        // General
        "d-bg-base": "bg-white dark:bg-slate-900",
        "d-focus-base": "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75",
        "d-text-base": "text-slate-900 dark:text-white",
        "d-container-base": "sm:px-6 max-w-screen-2xl", // px-4 py-4 mx-auto
        "d-link-base": "",

        // Body
        "d-body": "d-bg-base d-text-base min-h-screen",

        // Header
        "d-header-base": "sticky top-0 z-1 mt-8",
        "d-header": "d-header-base",
        "d-header-mobile-toggle": "flex md:hidden",
        "d-header-sticky": "shadow-md dark:shadow-2xl bg-opacity-90 dark:bg-opacity-90 bg-white dark:bg-slate-900",
        "d-header-title": "font-bold leading-7 text-2xl sm:text-3xl sm:truncate",
        "d-header-items": "d-container-base flex items-center justify-between space-x-4",
        "d-header-item": "flex",
        "d-header-links": "flex flex-1 justify-center space-x-8",
        "d-header-link": "px-4 py-2 font-medium rounded-full hover:bg-gray-200 dark:hover:bg-slate-700",

        // Page
        "d-page": "d-container-base my-5",

        // Buttons
        "d-button-base": "d-focus-base px-4 py-2 text-sm font-medium rounded-md shadow-sm hover:shadow-lg"
      },
      // Transitions
      [/^d-transition-(.*)$/, ([, duration]) => `transition-all duration-${duration}`],

      // Buttons
      [/^d-button-(.*)$/, ([, color]) => `d-button-base bg-${color}-200 dark:bg-${color}-600 hover:bg-${color}-300 dark:hover:bg-${color}-700 text-${color}-900 dark:text-${color}-100`],

      // Icons
      [/^d-icon-(.*)$/, ([, size]) => `w-${size} h-${size}`],

      // Links
      [/^d-link-(.*)$/, ([, color]) => `d-link-base text-${color}-900 hover:text-${color}-700 dark:text-${color}-300 dark:hover:text-${color}-100`]
    ]
  }
}

export const DeltUnocssNuxtOptions: UnocssNuxtOptions = {
  preflight: true,
  presets: [
    presetWind(),
    presetDelt()
  ]
}

// variants: [
//   variantMatcher("cold", async input => `.cold $$ ${input}`),
//   variantMatcher("warm", async input => `.warm $$ ${input}`)
// ]

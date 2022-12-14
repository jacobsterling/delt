/* eslint-disable vue/sort-keys */

import { mergeDeep, Preset } from "@unocss/core"
import type { UnocssNuxtOptions } from "@unocss/nuxt"
import { variantMatcher } from "@unocss/preset-mini/utils"
import type { Theme } from "@unocss/preset-uno"
import { theme as windTheme, presetWind } from "@unocss/preset-wind"

const presetDelt = (): Preset<Theme> => {
  return {
    name: "delt-ui",
    theme: mergeDeep(windTheme, {}),
    shortcuts: [
      {
        // General
        "d-bg-base": "bg-white dark:bg-slate-900 warm:bg-gradient-to-b warm:from-amber-300 warm:to-amber-100 cold:bg-gradient-to-b cold:from-sky-300 cold:to-sky-100",
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
        "d-header-sticky": "shadow-md dark:shadow-2xl bg-opacity-90 dark:bg-opacity-90 warm:bg-opacity-90 cold:bg-opacity-90 bg-white dark:bg-slate-900 warm:bg-amber-300 cold:bg-sky-300",
        "d-header-title": "font-bold leading-7 text-2xl sm:text-3xl sm:truncate",
        "d-header-items": "d-container-base flex items-center justify-between space-x-4",
        "d-header-item": "flex",
        "d-header-links": "flex flex-1 justify-center space-x-8",
        "d-header-link": "px-4 py-2 font-medium rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 warm:hover:bg-amber-400 cold:hover:bg-sky-400 warm:text-slate-900 warm:hover:text-slate-700 cold:text-slate-900 cold:hover:text-slate-700",

        // Page
        "d-page": "d-container-base",

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
    ],
    variants: [
      variantMatcher("cold", input => `.cold $$ ${input}`),
      variantMatcher("warm", input => `.warm $$ ${input}`)
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

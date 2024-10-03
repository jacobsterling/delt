import type { RouterConfig } from "@nuxt/schema"

// https://router.vuejs.org/api/#routeroptions
export default <RouterConfig> {
  scrollBehavior: (to) => {
    if (to.hash) {
      return { behavior: "smooth", el: to.hash }
    }

    return { behavior: "smooth", top: 0 }
  }
}

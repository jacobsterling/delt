
<script setup only lang="ts">
import { Disclosure, DisclosureButton, DisclosurePanel, MenuButton } from "@headlessui/vue"
import { XMarkIcon, Bars3BottomLeftIcon } from "@heroicons/vue/24/outline"
import { breakpointsTailwind, useBreakpoints, useWindowScroll } from "@vueuse/core"

import useUser from "~~/composables/useUser"
import { User } from "~~/types/db"

const router = useRouter()

const { smaller } = useBreakpoints(breakpointsTailwind)
const showMobileToggle = smaller("md")

const header = ref<HTMLElement | null>(null)
const { y } = useWindowScroll()

const navigation = ref([
  { href: "/games", name: "Browser" },
  { href: "/market", name: "Market" },
  { href: "/craft", name: "Craft" },
  { href: "/roadmap", name: "Roadmap" },
  { href: "/about", name: "About" }
])

const user = ref(await useUser())

watch(useState<User | null>("user"), async () => {
  user.value = await useUser()
}, { deep: true })

</script>

<template>
  <div>
    <header ref="header" class="d-header-items"
      :classs="[y >= header?.getBoundingClientRect()?.height ? 'd-header-sticky' : '', 'd-header']">

      <h1 class="d-header-item">
        <NuxtLink to="/" class="d-header-title">
          DELT
        </NuxtLink>
      </h1>

      <div class="d-header-items d-header-item">
        <Disclosure v-slot="{ open }" as="nav" class="d-header-items d-header-item">
          <DisclosurePanel class="md:hidden">
            <ul>
              <li v-for="page in navigation" :key="page.name" :to="page.href" class="d-header-link d-link-emerald">
                {{ page.name }}
              </li>
            </ul>
          </DisclosurePanel>

          <DisclosureButton v-if="showMobileToggle" class="d-header-mobile-toggle d-header-items d-header-item">
            <Bars3BottomLeftIcon v-if="!open" class="d-icon-6 d-header-item" aria-hidden="true" />
            <XMarkIcon v-if="open" class="d-icon-6 d-header-item" aria-hidden="true" />
          </DisclosureButton>

          <div v-else class="d-header-links hidden md:flex d-header-item">
            <NuxtLink v-for="page in navigation" :key="page.name" :to="page.href" class="d-header-link d-link-emerald">
              {{ page.name }}
            </NuxtLink>

            <div class="d-header-item hidden md:flex">
              <DeltThemeToggle class="d-header-item" />
            </div>
          </div>

        </Disclosure>

        <DeltButton class="d-button-emerald d-header-item" @click="() => {
          if (!user) { router.push('/login') } else { useLogout() }
        }">
          {{ user?.id || "Sign in" }}
        </DeltButton>
      </div>

    </header>
    <main class="d-page">
      <slot />
    </main>
  </div>
</template>

<style lang="css">
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s;
}

.page-enter,
.page-leave-to {
  opacity: 0;
}
</style>


<script setup only lang="ts">
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue"
// import { XMarkIcon } from "@heroicons/vue/24/outline"
import { breakpointsTailwind, useBreakpoints, useWindowScroll } from "@vueuse/core"

import useUser from "~~/composables/useUser"
import { User } from "~~/types/db"

const router = useRouter()

const { smaller } = useBreakpoints(breakpointsTailwind)
const showMobileToggle = smaller("md")

const header = ref<HTMLElement | null>(null)
const { y } = useWindowScroll()

const navigation = ref([
  { href: "/Market", name: "Market" },
  { href: "/Craft", name: "Craft" },
  { href: "/Roadmap", name: "Roadmap" },
  { href: "/About", name: "About" }
])

const user = useState<User | null>("user")
const isLoggedIn = ref(await useUser() == null)

async function checkIfLoggedIn() {
  isLoggedIn.value = await useUser() == null
}

watch(user, async () => {
  await checkIfLoggedIn()
}, { deep: true })

</script>

<template>
  <div>
    <header ref="header" :classs="[y >= header?.getBoundingClientRect()?.height ? 'd-header-sticky' : '', 'd-header']">
      <Disclosure v-slot="{ open }" as="nav" class="d-header-items">
        <h1 class="d-header-item">
          <NuxtLink to="/" class="d-header-title">
            DELT
          </NuxtLink>
        </h1>

        <DisclosurePanel class="md:hidden">
          <ul>
            <li v-for="page in navigation" :key="page.name" :to="page.href" class="d-header-link d-link-emerald">
              {{ page.name }}
            </li>
          </ul>
        </DisclosurePanel>

        <DisclosureButton v-if="showMobileToggle" class="d-header-mobile-toggle">
          <!-- <MenuButton v-if="!open" class="d-icon-6" aria-hidden="true" /> -->
          <!-- <XMarkIcon v-if="open" class="d-icon-6" aria-hidden="true" /> -->
        </DisclosureButton>

        <div class="d-header-links hidden md:flex">
          <NuxtLink v-for="page in navigation" :key="page.name" :to="page.href" class="d-header-link d-link-emerald">
            {{ page.name }}
          </NuxtLink>
        </div>

        <div class="d-header-items hidden md:flex">
          <DeltThemeToggle class="d-header-item" />
        </div>

        <DeltButton class="d-button-emerald mx-1 " @click="() => {
          if (!user) { router.push('/login') } else { useLogout() }
        }">
          {{ user?.id || "Sign in" }}
        </DeltButton>
      </Disclosure>
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

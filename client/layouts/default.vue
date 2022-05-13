<script setup lang="ts">
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue"
import { MenuIcon, SearchIcon, XIcon } from "@heroicons/vue/outline"
import { breakpointsTailwind } from "@vueuse/core"

import { UserLoginModal } from "#components"

const user = useSupabaseUser()
const client = useSupabaseClient()

const { $wallet: wallet } = useNuxtApp()
const accountCompact = ref<string>("Connect Wallet")

if (wallet) {
  if (wallet.accountCompact) {
    accountCompact.value = wallet.accountCompact
  }
}

const connectWallet = () => {
  if (!wallet) { wallet.connect() }
}

const { smaller } = useBreakpoints(breakpointsTailwind)
const showMobileToggle = smaller("md")

const header = ref<HTMLElement | null>(null)
const { y } = useWindowScroll()

const userLoginModal = ref<InstanceType<typeof UserLoginModal>>()
</script>

<template>
  <div>
    <UserLoginModal ref="userLoginModal" />
    <header ref="header" :class="[y >= header?.getBoundingClientRect()?.height ? 'd-header-sticky' : '', 'd-header']">
      <Disclosure v-slot="{ open }" as="nav" class="d-header-items">
        <DisclosureButton v-if="showMobileToggle" class="d-header-mobile-toggle">
          <span class="sr-only">Open Menu</span>
          <XIcon v-if="open" class="d-icon-6" aria-hidden="true" />
          <MenuIcon v-else class="d-icon-6" aria-hidden="true" />
        </DisclosureButton>
        <div class="d-header-item">
          <h1 class="d-header-title">
            <NuxtLink to="/">
              DELT
            </NuxtLink>
          </h1>
        </div>
        <div class="d-header-links hidden md:flex">
          <NuxtLink to="/Market" class="d-header-link d-link-emerald">
            Market
          </NuxtLink>
          <NuxtLink to="/Roadmap" class="d-header-link d-link-emerald">
            Roadmap
          </NuxtLink>
        </div>
        <div class="d-header-item hidden md:flex">
          <NuxtLink to="/Search">
            <SearchIcon class="d-icon-6" />
          </NuxtLink>
        </div>
        <div class="d-header-item hidden md:flex">
          <DeltButton v-if="user" class="d-button-zinc" @click="client.auth.signOut()">
            Sign Out
          </DeltButton>
          <DeltButton v-else class="d-button-zinc" @click="userLoginModal.open()">
            Login
          </DeltButton>
          <DeltButton class="d-button-emerald mx-1 " @click="connectWallet()">
            <div class="flex-inline justify-around">
              <img src="../assets/metamask.svg" size="5px" class="d-icon-5 flex mr-2">
              <div class="flex">
                {{ accountCompact }}
              </div>
            </div>
          </DeltButton>
        </div>
        <div class="d-header-item">
          <DeltThemeToggle />
        </div>

        <DisclosurePanel class="md:hidden">
          <div class="px-2 pt-2 pb-3 space-y-1">
            <DisclosureButton>
              Menu
            </DisclosureButton>
          </div>
        </DisclosurePanel>
      </Disclosure>
    </header>
    <!-- <header ref="header" :class="[y >= header?.getBoundingClientRect()?.height ? 'd-header-sticky' : '', 'd-header']">
      <nav class="d-header-items">
        <div class="d-header-item">
          <h1 class="d-header-title">
            <NuxtLink to="/">
              DELT
            </NuxtLink>
          </h1>
        </div>
        <div class="d-header-links hidden md:flex">
          <NuxtLink to="/Showcase" class="d-header-link d-link-emerald">
            Showcase
          </NuxtLink>
          <NuxtLink to="/FAQ" class="d-header-link d-link-emerald">
            FAQ
          </NuxtLink>
          <NuxtLink to="/About" class="d-header-link d-link-emerald">
            About
          </NuxtLink>
        </div>
        <div class="d-header-item hidden md:flex">
          <NuxtLink to="/Search">
            <SearchIcon class="d-icon-6" />
          </NuxtLink>
        </div>
        <div class="d-header-item hidden md:flex">
          <DeltButton class="d-button-emerald">
            Sign Up
          </DeltButton>
        </div>
        <div class="d-header-item hidden md:flex">
          <DeltButton class="d-button-zinc">
            Login
          </DeltButton>
        </div>
        <div class="d-header-item">
          <AppThemeToggle />
        </div>
      </nav>
    </header> -->
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

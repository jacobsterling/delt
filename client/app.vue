<script setup lang="ts">
// viewport: "width=device-width, initial-scale=1, maximum-scale=1"
useHead({
  bodyAttrs: {
    class: "d-body"
  },
  link: [
    { href: "favicon.svg", rel: "icon", type: "image/svg+xml" }
  ],
  meta: [
    { charset: "utf-8", content: "NFT Design and Apparel Marketplace.", name: "description" }
  ],
  titleTemplate: title => `DELT | ${title}`
})
</script>

<template>
  <NuxtLayout name="default">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  bodyAttrs: {
    class: "d-body"
  },
  charset: "utf-8",
  link: [
    { href: "favicon.svg", rel: "icon", type: "image/svg+xml" }
  ],
  meta: [
    { content: "NFT Design and Apparel Marketplace.", name: "description" }
  ],
  titleTemplate: title => `DELT | ${title}`,
  viewport: "width=device-width, initial-scale=1, maximum-scale=1"
})
</script>

<template>
  <NuxtLayout name="default">
    <NuxtPage />
  </NuxtLayout>
</template>

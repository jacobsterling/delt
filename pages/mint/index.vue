<script setup lang="ts">

import { Token } from "~~/plugins/near.client"

const { $near: near } = useNuxtApp()

// const { data: unminted } = await client.from("unminted").select("*")

const svg = ref<string>("<?xml version=\\\"1.0\\\" standalone = \\\"yes\\\" ?><svg xmlns=\\\"http://www.w3.org/2000/svg\\\" width = \\\"32\\\" height = \\\"32\\\" ><path style=\\\"fill:#030205; stroke:none;\\\" d = \\\"M0 0L0 32L12 32L12 27L9 26L11 18C15.0438 20.0969 16.9562 20.0969 21 18L25 21L20 32L32 32L32 0L0 0z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M9 15L9 16L23 16L23 15L18 8L21 9C15.633 3.91586 12.8464 11.7085 9 15z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M13 17L14 18L13 17z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M14 17L15 18L14 17z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M17 17L18 18L17 17z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M18 17L19 18L18 17z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M11 18L11 31L21 31L18 21L22 21L21 18L11 18z\\\" /><path style=\\\"fill:#6b5033; stroke:none;\\\" d = \\\"M18 21C19.2603 24.7979 21.3258 24.9792 25 24L25 21L18 21z\\\" /><path style=\\\"fill:#cdebef; stroke:none;\\\" d = \\\"M20 21L20 22L23 22L20 21z\\\" /><path style=\\\"fill:#0d1b94; stroke:none;\\\" d = \\\"M23 21L24 22L23 21M24 22L25 23L24 22z\\\" /><path style=\\\"fill:#b5a06c; stroke:none;\\\" d = \\\"M9 24L12 27L9 24M20 25L20 26L23 26L20 25z\\\" /></svg>")

const mint = async (token: Token) => {
  if (near) {
    token.svg = svg.value
    await near.mint(token)
  }
}

</script>

<template>
  <div class="inline-flex justify-center">
    <TokenCard v-for="token in unminted" :item="token">
      <li>
        <DeltButton @click="mint(token)" />
      </li>
    </TokenCard>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable indent */

const state = ref("install")

if (typeof window.ethereum !== "undefined") {
  state.value = "connect"
}

const init = async () => {
  switch (state.value) {
    case "install": {
      window.open("https://metamask.io/download")
      break
    }
    case "connect": {
      const [accounts] = await ethereum.request({ method: "eth_requestAccounts" })
      state.value = accounts
      break
    }
    default: {
      deinit()
      break
    }
  }
}

const deinit = async () => {
  await ethereum
  return console.info(ethereum)
}

</script>

<template>
  <button class="card border-[#2d2d2d] border-1 bg-blue rounded-2xl px-4 py-2 font-size-10 text-2xl flex content-center"
    @click="init">
    {{ state }}
  </button>
</template>

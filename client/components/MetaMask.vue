<template>
  <button
    class="card border-[#2d2d2d] border-1 bg-blue rounded-2xl px-4 py-2 font-size-10 text-2xl flex content-center"
    @click="$wallet.account === undefined ? $wallet.connect : $wallet.setAccount(undefined)"
  >
    {{ $wallet.accountCompact || "Connect" }}
  </button>
</template>

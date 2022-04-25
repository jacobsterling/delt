<script setup lang="ts">
const loginModalVisible = ref(false)
</script>

<template>
  <nav class="inline-block p-5 flex w-full bg-[#181818] border-[#2d2d2d] border-b-1 justify-between">
    <DeltLogo />
    <SearchBar />
    <div class="justify-between inline-block flex">
      <LoginButton @click="loginModalVisible = !loginModalVisible" />
      <LoginModal :visible="loginModalVisible" />
      <MetaMask />
    </div>
  </nav>
</template>

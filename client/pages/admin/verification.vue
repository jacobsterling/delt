<script setup lang="ts">
const user = useSupabaseUser()
const router = useRouter()
const { type } = await useUser(user.value.id)

if (type !== "admin") { router.push("/") }

</script>

<template>
  <div>
    verification
  </div>
</template>

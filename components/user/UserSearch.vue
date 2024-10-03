<script setup lang="ts">

const props = defineProps({
  from: {
    default: 0,
    required: false,
    type: Number,
    validator: prop => typeof prop === "number"
  },
  to: {
    default: 50,
    required: true,
    type: Number,
    validator: prop => typeof prop === "number"
  },
})

import { User } from "~/types/db"
import { Ref } from "vue"

const users: Ref<User[]> = ref([])

const selected_user = ref<User | undefined>(undefined)

const search = async (input: Event) => {

  if (input.target && input.target.value.length > 0) {
    try {
      users.value = await useUsers(input.target.value, props.to, props.from)
    } catch (e) {
      console.error("Search Error: ", e)
    }
  }
}

const selectUser = (user: User) => {
  if (selected_user.value === user) {
    selected_user.value = undefined
  } else {
    selected_user.value = user
  }
}

</script>

<template>
  <div>
    <input type="text" @input="search" placeholder="search user" />
    <ul v-if="users.length > 0">
      <li v-for="user in users" :key="user.id" class="flex-inline" @click="selectUser(user)">
        {{ user.id }}
      </li>
    </ul>
    <div v-else>
      No Results
    </div>
  </div>
</template>
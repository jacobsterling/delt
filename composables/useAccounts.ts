/* eslint-disable camelcase */

import { Account, User } from "~~/types/db"

export default async (user_id?: string): Promise<Account[]> => {
  const { data, error } = await useFetch<Account[]>("/api/accounts", { body: user_id || useState<User | null>("user").value?.id, method: "POST" })

  if (data.value) {
    return data.value as Account[]
  }

  throw error.value || createError({ statusCode: 500, statusMessage: "Error fetching accounts" })
}

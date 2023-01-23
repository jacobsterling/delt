/* eslint-disable camelcase */

import { Account } from "~~/types/db"

export default async (user_id?: string): Promise<Account> => {

  const { $near } = useNuxtApp()

  await $near.wallet.isSignedInAsync()

  const account_id = $near.wallet.getAccountId()

  let registered = (await useAccounts(user_id || (await useUser())?.id)).find(account => account.account_id == account_id)

  if (!registered) {
    const { data, error } = await useFetch<Account>("/api/accounts/register", { body: account_id, method: "POST" })

    if (!data.value) {
      throw error.value
    }
  }

  const { data, error } = await useFetch<Account>("/api/accounts/update", { body: { account_id }, method: "POST" })

  if (data.value) {
    return data.value
  }

  throw error.value || createError({ statusCode: 500, statusMessage: "Error fetching account" })
}
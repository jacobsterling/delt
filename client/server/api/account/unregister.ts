/* eslint-disable camelcase */
import { z, parseBodyAs } from "@sidebase/nuxt-parse"

import { removeAccount, getAccountsByUser } from "~~/server/database/repositories/accountRepository"
import { getUserByAuthToken } from "~~/server/database/repositories/sessionRepository"
import { Account } from "~~/types/db"

const bodySchema = z.object({
  account_id: z.string({
    required_error: "account id required"
  })
    .min(1, { message: "account id required" }).endsWith(".testnet")
})

export default defineEventHandler<Account | null>(async (event) => {
  const body = await parseBodyAs(event, bodySchema)
  const auth_token = getCookie(event, "auth_token")

  if (auth_token) {
    const user = await getUserByAuthToken(auth_token)
    if (user) {
      const accounts = await getAccountsByUser(user.id)

      if (!accounts.find(a => a.account_id === body.account_id)) {
        sendError(event, createError({ statusCode: 422, statusMessage: "Account id does not exists" }))
      }

      return await removeAccount(body.account_id)
    }
  }

  return null
})

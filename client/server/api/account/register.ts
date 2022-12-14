/* eslint-disable camelcase */
import { z, parseBodyAs } from "@sidebase/nuxt-parse"

import { doesAccountExist } from "~~/server/app/services/accountService"
import { createAccount } from "~~/server/database/repositories/accountRepository"
import { getUserByAuthToken } from "~~/server/database/repositories/sessionRepository"
import { Account } from "~~/types/db"

const bodySchema = z.object({
  account_id: z.string({
    required_error: "account id required"
  })
    .min(1, { message: "account id required" }).endsWith(".testnet")
})

export default defineEventHandler<Account | null>(async (event) => {
  const { account_id } = await parseBodyAs(event, bodySchema)
  const auth_token = getCookie(event, "auth_token")

  if (auth_token) {
    const user = await getUserByAuthToken(auth_token)
    if (user) {
      if (account_id === undefined) {
        sendError(event, createError({ statusCode: 422, statusMessage: "Wallet not signed in" }))
      }

      if (await doesAccountExist(account_id)) {
        sendError(event, createError({ statusCode: 422, statusMessage: "Account id exists" }))
      }

      return await createAccount({ account_id, user_id: user.id })
    }
  }

  return null
})

/* eslint-disable camelcase */
import { z } from "@sidebase/nuxt-parse"
import { internalError } from "~~/server/app/errors"
import parseEvent from "~~/server/app/parse"
import { accountsByUser, deleteAccount } from "~~/server/database/accounts"
import { authByToken } from "~~/server/database/auth"
import { Account } from "~~/types/db"
import { isNuxtError } from "#app"

const body_schema = z.string({
  required_error: "account id required"
})
  .min(1, { message: "account id required" }).endsWith(".testnet")

export default defineEventHandler<Account | void>(async (event) => {
  const account_id = await parseEvent(event, body_schema)
  const auth_token = getCookie(event, "auth_token")

  try {
    if (!auth_token) {
      throw createError({ statusCode: 401, statusMessage: "Not Logged in" })
    }

    const user = await authByToken(auth_token)

    if (!user) {
      throw internalError
    }

    const accounts = await accountsByUser(user.user_id)

    if (!accounts.find(a => a.account_id === account_id)) {
      throw createError({ statusCode: 422, statusMessage: "Account id does not exists" })
    }

    const account = await deleteAccount(account_id)

    if (!account) {
      throw internalError
    }

    return account as Account
  } catch (e: any) {
    return sendError(event, e)
  }
})

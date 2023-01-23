/* eslint-disable camelcase */
import { z } from "@sidebase/nuxt-parse"
import { internalError } from "~~/server/app/errors"
import parseBody from "~~/server/app/parse"
import { accountById, createAccount } from "~~/server/database/accounts"
import { authByToken } from "~~/server/database/auth"
import { Account } from "~~/types/db"


const body_schema = z.string({
  required_error: "account id required"
})
  .min(1, { message: "account id required" }).endsWith(".testnet")

export default defineEventHandler<Account | void>(async (event) => {
  const account_id = await parseBody(event, body_schema)
  const auth_token = getCookie(event, "auth_token")
  try {

    if (!auth_token) {
      throw createError({ statusCode: 401, statusMessage: "Not Logged in" })
    }

    const user = await authByToken(auth_token)

    if (!user) {
      throw internalError
    }

    if (!await accountById(account_id)) {
      throw createError({ statusCode: 409, statusMessage: "Account exists", data: "account_id" })
    }

    return await createAccount(account_id, user!.user_id) as Account
  } catch (e: any) {
    return sendError(event, e)
  }

})

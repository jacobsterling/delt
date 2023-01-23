import { z } from "@sidebase/nuxt-parse"

import parseBody from "~~/server/app/parse"
import { accountById, updateAccount } from "~~/server/database/accounts"

import { Account } from "~~/types/db"

const body_schema = z.object({
  account_id: z.string({
    required_error: "account id required"
  })
    .min(1, { message: "account id required" }).endsWith(".testnet"),
  rewards: z.object<{ [time: string]: any }>({}).optional()
})

export default defineEventHandler<Account | void>(async (event) => {
  const { account_id, rewards } = await parseBody(event, body_schema)

  try {

    const existing = await accountById(account_id)

    if (!existing) {
      throw createError({ statusCode: 422, statusMessage: "Account does not exist" })
    }

    const account = await updateAccount(account_id, Object.assign(existing?.rewards || {}, rewards || {}))

    if (!account) {
      throw createError({ statusCode: 422, statusMessage: "Error updating account" })
    }

    return account as Account
  } catch (e: any) {
    return sendError(event, e)
  }
})
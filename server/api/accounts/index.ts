
import { z } from "@sidebase/nuxt-parse"

import parseBody from "~~/server/app/parse"
import { accountsByUser } from "~~/server/database/accounts"

import { Account } from "~~/types/db"

const body_schema = z.string({
  required_error: "username required"
}).min(1, { message: "username required" })

export default defineEventHandler<Account[] | void>(async (event) => {
  const user_id = await parseBody(event, body_schema)

  const accounts = []

  try {
    for (const account of await accountsByUser(user_id)) {
      accounts.push(account as Account)
    }

    return accounts
  } catch (e: any) {
    return sendError(event, e)
  }
})


import { z } from "@sidebase/nuxt-parse"

import { User } from "~~/types/db"
import parseBody from "~~/server/app/parse"
import { userByEmail, userById } from "~~/server/database/users"

const body_schema = z.string({
  required_error: "username or email required"
}).min(1, { message: "username or email required" })

export default defineEventHandler<User | void>(async (event) => {
  const data = await parseBody(event, body_schema)

  const email_regex = /\/^(([^<>()[]\.,;:s@\"]+(.[^<>()[]\.,;:s@\"]+)*)|(\".+\"))@(([[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}])|(([a-zA-Z-0-9]+.)+[a-zA-Z]{2,}))$\//

  try {
    const user = (email_regex.test(data) ? await userByEmail(data) : await userById(data))
    if (user) {
      return user as User
    }

    throw createError({ statusCode: 422, statusMessage: "Error fetching user" })

  } catch (e: any) {
    return sendError(event, e)
  }
})

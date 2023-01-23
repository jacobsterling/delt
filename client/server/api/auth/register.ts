
import { z } from "@sidebase/nuxt-parse"


import { User } from "../../../types/db"

import parseBody from "~~/server/app/parse"
import { create, userByEmail, userById } from "~~/server/database/users"


const body_schema = z.object({
  email: z.string({
    required_error: "email required"
  }).email({ message: "valid email required" }),
  id: z.string({
    required_error: "username required"
  })
    .min(1, { message: "username required" }),
  password: z.string({
    required_error: "password required"
  })
    .min(8, { message: "password must be at least 8 characters" })
})

export default defineEventHandler<User | void>(async (event) => {

  const { email, id, password } = await parseBody(event, body_schema)

  const email_regex = /\/^(([^<>()[]\.,;:s@\"]+(.[^<>()[]\.,;:s@\"]+)*)|(\".+\"))@(([[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}])|(([a-zA-Z-0-9]+.)+[a-zA-Z]{2,}))$\//

  if (!email_regex.test(email)) {
    throw createError({ statusCode: 422, statusMessage: `Invalid email format`, data: "email" })
  }

  try {
    if (await userByEmail(id)) {
      throw createError({ statusCode: 409, statusMessage: `"${email}" is in use`, data: "email" })
    }

    if (await userById(id)) {
      throw createError({ statusCode: 409, statusMessage: `"${id}" is in use`, data: "id" })
    }

    return await create(email, id, password) as User
  } catch (e: any) {
    return sendError(event, e)
  }
})
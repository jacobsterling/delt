import { z } from "@sidebase/nuxt-parse"
import { compare } from "bcrypt"

import { User } from "~~/types/db"
import parseBody from "~~/server/app/parse"
import { userByEmail, userById } from "~~/server/database/users"
import { createAuth } from "~~/server/database/auth"

const body_schema = z.object({
  password: z.string({
    required_error: "password required"
  }).min(8, { message: "password must be at least 8 characters" }),
  username_email: z.string({
    required_error: "username or email required"
  })
    .min(1, { message: "username or email required" })
})

export default defineEventHandler<User | void>(async (event) => {
  const { username_email, password } = await parseBody(event, body_schema)

  const email_regex = /\/^(([^<>()[]\.,;:s@\"]+(.[^<>()[]\.,;:s@\"]+)*)|(\".+\"))@(([[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}])|(([a-zA-Z-0-9]+.)+[a-zA-Z]{2,}))$\//

  try {
    const user = email_regex.test(username_email) ? await userByEmail(username_email) : await userById(username_email)

    if (user) {
      if (!user.password || !await compare(password, user.password)) {
        throw createError({ data: "password", statusCode: 401, statusMessage: "Incorrect Password" })
      }

      const session = await createAuth(user.id)

      setCookie(event, "auth_token", session.auth_token, { httpOnly: false, path: "/" })

      return user as User
    }

    throw createError({ data: "id", statusCode: 404, statusMessage: "Username or email does not exist" })

  } catch (e: any) {
    return sendError(event, e)
  }
})

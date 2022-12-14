
import { z, parseBodyAs } from "@sidebase/nuxt-parse"
import { hash } from "bcrypt"

import { makeSession } from "~~/server/app/services/sessionService"
import { doesUserExist } from "~~/server/app/services/userService"
import { createUser } from "~~/server/database/repositories/userRepository"

import { User } from "../../../types/db"

const bodySchema = z.object({
  email: z.string({
    required_error: "valid email required"
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

export default defineEventHandler<User | null>(async (event) => {
  const body = await parseBodyAs(event, bodySchema)

  const userExists = await doesUserExist(body.email, body.id)

  if (userExists.value) {
    sendError(event, createError({ statusCode: 422, statusMessage: userExists.message }))
  }

  body.password = await hash(body.password, 10)

  const user = await createUser(body)

  return await makeSession(event, user.id) as User | null
})

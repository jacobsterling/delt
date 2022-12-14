import { z, parseBodyAs } from "@sidebase/nuxt-parse"
import { compare } from "bcrypt"
import { ZodError } from "zod"

import { getMappedError } from "~~/server/app/errors/errorMapper"
import sendDefaultErrorResponse from "~~/server/app/errors/responses/defaultErrorsResponse"
import sendZodErrorResponse from "~~/server/app/errors/responses/zodErrorsResponse"
import { makeSession } from "~~/server/app/services/sessionService"
import { getUserByEmail, getUserById } from "~~/server/database/repositories/userRepository"

const standardAuthError = getMappedError("Authentication", "Invalid Credentials")

const bodySchema = z.object({
  password: z.string({
    required_error: "password required"
  }).min(8, { message: "password must be at least 8 characters" }),
  usernameOrEmail: z.string({
    required_error: "username or email required"
  })
    .min(1, { message: "username or email required" })
})

export default defineEventHandler(async (event) => {
  try {
    const data = await parseBodyAs(event, bodySchema)

    const emailRegex = /\/^(([^<>()[]\.,;:s@\"]+(.[^<>()[]\.,;:s@\"]+)*)|(\".+\"))@(([[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}])|(([a-zA-Z-0-9]+.)+[a-zA-Z]{2,}))$\//

    const user = emailRegex.test(data.usernameOrEmail) ? await getUserByEmail(data.usernameOrEmail) : await getUserById(data.usernameOrEmail)

    if (user === null) {
      return sendError(event, createError({ data: standardAuthError, statusCode: 401 }))
    }

    if (user.password === undefined || !await compare(data.password, user.password)) {
      sendError(event, createError({ data: standardAuthError, statusCode: 401 }))
    }

    return await makeSession(event, user.id)
  } catch (error: any) {
    if (error.data instanceof ZodError) {
      return sendZodErrorResponse(event, error.data)
    }

    return sendDefaultErrorResponse(event, "Unauthenticated", 401, error)
  }
})

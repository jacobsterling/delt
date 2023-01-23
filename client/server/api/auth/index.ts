/* eslint-disable camelcase */

import { User } from "~~/types/db"

import { authByToken } from "~~/server/database/auth"

import { userById } from "~~/server/database/users"
import { internalError } from "~~/server/app/errors"


export default defineEventHandler<User | void>(async (event) => {
  const auth_token = getCookie(event, "auth_token")

  try {
    if (auth_token) {
      const session = await authByToken(auth_token)

      return session ? await userById(session.user_id) as User : sendError(event, internalError)
    }

    throw createError({ statusCode: 412, statusMessage: "User session does not exist" })

  } catch (e: any) {
    return sendError(event, e)
  }
})

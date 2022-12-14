/* eslint-disable camelcase */

import { H3Event } from "h3"
import { v4 } from "uuid"

import { createSession, getUserByAuthToken } from "../../database/repositories/sessionRepository"

export async function makeSession(event: H3Event, user_id: string) {
  const auth_token = v4().replaceAll("-", "")
  const session = await createSession({ auth_token, user_id })

  if (session.user_id) {
    setCookie(event, "auth_token", auth_token, { httpOnly: false, path: "/" })
    return getUserByAuthToken(auth_token)
  }

  throw new Error("Error Creating Session")
}

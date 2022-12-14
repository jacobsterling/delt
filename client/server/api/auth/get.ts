/* eslint-disable camelcase */
import { getUserByAuthToken } from "~~/server/database/repositories/sessionRepository"
import { User } from "~~/types/db"

export default defineEventHandler<User | null>(async (event) => {
  const auth_token = getCookie(event, "auth_token")
  if (auth_token) {
    return await getUserByAuthToken(auth_token) as User | null
  }

  return null
})

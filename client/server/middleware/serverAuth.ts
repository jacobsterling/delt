
import { H3Event } from "h3"

import prisma from "~~/server/database"

export default defineEventHandler(async (event) => {

  const isAllowed = await protectAuthRoute(event)

  if (!isAllowed) {
    return sendError(event, createError({ statusCode: 401, statusMessage: "Unauthorized" }))
  }
})

async function protectAuthRoute(event: H3Event): Promise<boolean> {
  const protectedRoutes = [
    "/api/games/create"
  ]

  if (!event?.path || !protectedRoutes.includes(event.path)) {
    return true
  }

  const auth_token = getCookie(event, "auth_token")

  return auth_token ? await prisma.user_sessions.findUnique({ where: { auth_token } }) !== undefined : false
}

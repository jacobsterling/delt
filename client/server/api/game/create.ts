/* eslint-disable camelcase */
import { z, parseBodyAs } from "@sidebase/nuxt-parse"

import { createGame } from "~~/server/database/repositories/gameRepository"
import { getUserByAuthToken } from "~~/server/database/repositories/sessionRepository"
import { Game } from "~~/types/db"

const bodySchema = z.object({
  id: z.string({
    required_error: "valid id required"
  }).max(50),
  lvl_required: z.onumber(),
  pool_id: z.ostring()
})

export default defineEventHandler<Game | null>(async (event) => {
  const { id, lvl_required, pool_id } = await parseBodyAs(event, bodySchema)

  const auth_token = getCookie(event, "auth_token")

  if (!auth_token) {
    sendError(event, createError({ statusCode: 422, statusMessage: "Not signed in" }))
  }

  const user = await getUserByAuthToken(auth_token as string)

  if (user) {
    return await createGame({ creator: user.id, id, lvl_required, pool_id })
  }

  sendError(event, createError({ statusCode: 422, statusMessage: "No user session" }))
})

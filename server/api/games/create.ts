/* eslint-disable camelcase */

import { z } from "@sidebase/nuxt-parse"
import { Game } from "~~/types/db"
import parseBody from "~~/server/app/parse"
import { createGame, gameById } from "~~/server/database/games"
import { internalError } from "~~/server/app/errors"
import { authByToken } from "~~/server/database/auth"

const body_schema = z.object({
  config: z.object({
    session_attempts: z.onumber(),
    level_required: z.number({
      required_error: "Level requirement required"
    }),
    player_attempts: z.onumber(),
    player_limit: z.number({
      required_error: "Player limit required"
    }),
    teams: z.number({
      required_error: "Number of Teams required"
    })
  }),
  expiry: z.date().optional(),
  id: z.string({
    required_error: "valid id required"
  }).max(50)
})

export default defineEventHandler<Game | void>(async (event) => {
  const { id, config, expiry } = await parseBody(event, body_schema)

  const auth_token = getCookie(event, "auth_token")
  try {
    if (!auth_token) {
      throw createError({ statusCode: 401, statusMessage: "Not Logged in" })
    }

    const user = await authByToken(auth_token)

    if (!user) {
      throw internalError
    }

    if (await gameById(id)) {
      throw createError({ statusCode: 409, statusMessage: `Game Id "${id}" already exists` })
    }

    return await createGame(id, user.user_id, config, expiry) as Game

  } catch (e: any) {
    return sendError(event, e)
  }
})
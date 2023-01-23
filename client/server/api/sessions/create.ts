
import { z } from "@sidebase/nuxt-parse"

import { Game, Session } from "~~/types/db"

import parseBody from "~~/server/app/parse"
import { internalError } from "~~/server/app/errors"
import { authByToken } from "~~/server/database/auth"
import { SessionState } from "~~/game/scenes/baseScene"
import { createPoolRef, poolRefById } from "~~/server/database/pools"
import { createSession, createWhitelist, sessionsByGame } from "~~/server/database/sessions"
import { gameById } from "~~/server/database/games"
import { playerSessionsByGame } from "~~/server/database/players"

const body_schema = z.object({
  game_id: z.string({
    required_error: "game id required"
  }).max(50),
  whitelist: z.array(z.string()).optional(),
  password: z.ostring(),
  state: z.any(),
  pool_id: z.ostring(),
  private: z.oboolean().default(false)
})

export default defineEventHandler<Session | void>(async (event) => {
  const { game_id, whitelist, password, state, pool_id, private: priv } = await parseBody(event, body_schema)

  const auth_token = getCookie(event, "auth_token")

  try {
    if (!auth_token) {
      throw createError({ statusCode: 401, statusMessage: "Not Logged in" })
    }

    const user_session = await authByToken(auth_token)

    if (!user_session) {
      throw internalError
    }

    const game = await gameById(game_id)

    if (!game) {
      throw createError({ statusCode: 422, statusMessage: "Game does not exist" })
    }

    const { config: { session_attempts, player_attempts }, expiry, ended_at } = game as Game

    if (expiry && expiry < new Date()) {
      throw createError({ statusCode: 422, statusMessage: "Game has expired" })
    }

    if (ended_at && ended_at < new Date()) {
      throw createError({ statusCode: 422, statusMessage: "Game has ended" })
    }

    if (player_attempts && (await playerSessionsByGame(user_session.user_id, game_id)).length + 1 > player_attempts) {
      throw createError({ statusCode: 401, statusMessage: "Max attempts reached", data: "player_attempts" })
    }

    if (session_attempts && session_attempts + 1 > (await sessionsByGame(game_id)).length) {
      throw createError({ statusCode: 422, statusMessage: "Max session attempts reached", data: session_attempts })
    }

    if (pool_id && !await poolRefById(pool_id)) {
      await createPoolRef(pool_id)
    }

    const session = await createSession(game_id, user_session.user_id, state, priv, pool_id, password)

    if (whitelist) {
      whitelist.push(user_session.user_id)

      for (const user_id of whitelist) {
        try {
          await createWhitelist(session.id, user_id)
        } catch (e: any) { }
      }
    }

    return {
      id: session.id, created_at: session.created_at, creator: session.creator, game_id: session.game_id, logs: session.logs as { [time: string]: string }, password: session.password != null, pool_id: session.pool_id as string | undefined, private: session.private, whitelist,
      state: session.state as unknown as SessionState, players: 0
    }

  } catch (e: any) {
    return sendError(event, e)
  }
})
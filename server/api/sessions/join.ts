/* eslint-disable camelcase */

import { z } from "@sidebase/nuxt-parse"

import { GameConfig, PlayerInfo, PlayerSession } from "~~/types/db"

import parseBody from "~~/server/app/parse"
import { internalError } from "~~/server/app/errors"
import { authByToken } from "~~/server/database/auth"
import { compare } from "bcrypt"
import { createPlayerSession, playersBySession, playerSession, playerSessionsByGame } from "~~/server/database/players"
import { sessionById } from "~~/server/database/sessions"
import { gameById } from "~~/server/database/games"
import { get_character } from "~~/server/app/near"

const body_schema = z.object({
  account_id: z.ostring(),
  session_id: z.string({
    required_error: "session id required"
  }),
  password: z.ostring(),
})

export default defineEventHandler<PlayerSession | void>(async (event) => {
  const { password, account_id, session_id } = await parseBody(event, body_schema)

  const auth_token = getCookie(event, "auth_token")

  try {

    if (!auth_token) {
      throw createError({ statusCode: 401, statusMessage: "Not Logged in" })
    }

    const user_session = await authByToken(auth_token)

    if (!user_session) {
      throw internalError
    }

    const session = await sessionById(session_id)

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: "Session does not exist", data: "session_id" })
    }

    const game = await gameById(session.game_id)

    if (!game) {
      throw internalError
    }

    const { player_limit, level_required, player_attempts } = game.config as GameConfig

    let player = await playerSession(user_session.user_id, session_id)

    if (!player) {
      if ((await playersBySession(session_id)).filter(player => !player.ended_at).length > player_limit) {
        throw createError({ statusCode: 401, statusMessage: "Max players reached", data: "player_limit" })
      }

      if (player_attempts && (await playerSessionsByGame(user_session.user_id, game.id)).length + 1 > player_attempts) {
        throw createError({ statusCode: 401, statusMessage: "Max attempts reached", data: "player_attempts" })
      }

      if (session.ended_at) {
        throw createError({ statusCode: 409, statusMessage: "Session has ended", data: "ended_at" })
      }

      if (session.password && !await compare(password || "", session.password) && session.creator != user_session.user_id) {
        throw createError({ statusCode: 401, statusMessage: "Incorrect password", data: "password" })
      }

      if (session.whitelist.length > 0 && !session.whitelist.find(whitelist => whitelist.user_id == user_session.user_id)) {
        throw createError({ statusCode: 401, statusMessage: "Must be whitelisted to join", data: "whitelist" })
      }

      if (session.pool_id || level_required) {
        if (!account_id) {
          throw createError({ statusCode: 401, statusMessage: "Account id required", data: "account_id" })
        }

        const character = await get_character(account_id)

        if (useLevel(character.xp) < level_required) {
          throw createError({ statusCode: 404, statusMessage: "xp requirement not reached", data: "account_id" })
        }
      }

      player = await createPlayerSession(session_id, user_session.user_id)
    }

    const { created_at, user_id, info } = player

    return {
      session_id,
      user_id,
      created_at,
      info: info as unknown as PlayerInfo | undefined
    } as PlayerSession

  } catch (e: any) {
    return sendError(event, e)
  }
})
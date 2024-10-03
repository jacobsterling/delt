import { z } from "@sidebase/nuxt-parse"

import { Session } from "~~/types/db"

import parseBody from "~~/server/app/parse"
import { sessionById, sessionsByGame } from "~~/server/database/sessions"

import { SessionState } from "~~/game/scenes/baseScene"
import { playersBySession } from "~~/server/database/players"

const body_schema = z.object({
  session_id: z.ostring(),
  game_id: z.ostring()
})

export default defineEventHandler<Session | Session[] | void>(async (event) => {
  const { session_id, game_id } = await parseBody(event, body_schema)

  try {

    if (session_id) {

      const session = await sessionById(session_id)

      if (!session) {
        throw createError({ statusCode: 422, statusMessage: "Session does not exist" })
      }

      return {
        id: session.id, created_at: session.created_at, creator: session.creator, game_id: session.game_id, logs: session.logs as { [time: string]: string }, password: session.password != null, pool_id: session.pool_id as string | undefined, private: session.private, whitelist: session.whitelist ? session.whitelist.map(whitelist => whitelist.user_id) : undefined,
        state: session.state as unknown as SessionState, players: (await playersBySession(session_id)).filter(player => player.ended_at).length
      }
    }

    if (game_id) {

      const sessions: Session[] = []

      for (const session of await sessionsByGame(game_id)) {
        sessions.push({
          id: session.id, created_at: session.created_at, creator: session.creator, game_id: session.game_id, logs: session.logs as { [time: string]: string }, password: session.password != null, pool_id: session.pool_id as string | undefined, private: session.private, whitelist: session.whitelist ? session.whitelist.map(whitelist => whitelist.user_id) : undefined,
          state: session.state as unknown as SessionState, players: (await playersBySession(session.id)).filter(player => player.ended_at).length
        })
      }

      return sessions
    }

    throw createError({ statusCode: 422, statusMessage: "Either game or session id required", data: "id" })

  } catch (e: any) {
    return sendError(event, e)
  }


})

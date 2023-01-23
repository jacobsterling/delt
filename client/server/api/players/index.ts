
import { z } from "@sidebase/nuxt-parse"

import parseBody from "~~/server/app/parse"
import { playersBySession, playerSession } from "~~/server/database/players"

import { PlayerInfo, PlayerSession } from "~~/types/db"

const body_schema = z.object({
  session_id: z.string({
    required_error: "session id required"
  }),
  username: z.ostring(),
})

export default defineEventHandler<PlayerSession | PlayerSession[] | void>(async (event) => {
  const { session_id, username } = await parseBody(event, body_schema)

  try {

    if (username) {
      const player = await playerSession(username, session_id)

      if (player) {
        return {
          session_id,
          user_id: player.user_id,
          created_at: player.created_at,
          info: player.info as unknown as PlayerInfo
        } as PlayerSession
      }

      throw createError({ statusCode: 404, statusMessage: "Player session does not exist", data: "id" })

    } else {
      const players: PlayerSession[] = []

      for (const player of await playersBySession(session_id)) {
        players.push({
          session_id,
          user_id: player.user_id,
          created_at: player.created_at,
          info: player.info as unknown as PlayerInfo
        })
      }

      return players
    }
  } catch (e: any) {
    return sendError(event, e)
  }
})


import { Game } from "~~/types/db";
import { isNuxtError } from "#app"

import { z } from "@sidebase/nuxt-parse";
import parseBody from "~~/server/app/parse";
import { allGames, searchGames } from "~~/server/database/games";
import { internalError } from "~~/server/app/errors";

const body_schema = z.object({
  game_id: z.ostring(),
})

export default defineEventHandler<Game[] | void>(async (event) => {
  const { game_id } = await parseBody(event, body_schema)

  const res: Game[] = []

  try {
    const games = game_id ? await searchGames(game_id) : await allGames() || []

    for (const game of games) {
      res.push(game as Game)
    }

    return res
  } catch (e: any) {
    return sendError(event, e)
  }
})
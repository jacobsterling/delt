
import { getGames } from "~~/server/database/repositories/gameRepository"
import { Game } from "~~/types/db"

export default defineEventHandler<Game[] | null>(async (event) => {
  const games = await getGames()

  const list = []

  for (const game of games) {
    list.push(game as Game)
  }

  return list
})

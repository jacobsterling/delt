import { Game } from "~~/types/db"

export default async (game_id?: string): Promise<Game[]> => {

  const { data, error } = await useFetch<Game[]>("/api/games/get", { body: { game_id }, method: "POST" })

  if (data.value) {
    return data.value
  }

  throw error.value || createError({ statusCode: 500, statusMessage: "Error fetching sessions" })
}
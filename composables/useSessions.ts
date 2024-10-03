import { Game, Session } from "~~/types/db"

export default async (game_id: string): Promise<Session[]> => {

  const { data, error } = await useFetch<Session[]>("/api/sessions", { body: { game_id }, method: "POST" })

  if (data.value) {
    return data.value
  }

  throw error.value || createError({ statusCode: 500, statusMessage: "Error fetching sessions" })
}
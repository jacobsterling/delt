import { Game, GameConfig } from "~~/types/db";

export default async (id: string, config: GameConfig, expiry?: Date) => {
  const { data, error } = await useFetch<Game>("/api/game/create", {
    body: { config, expiry, id },
    method: "POST"
  })

  if (data.value) {
    return data.value

  }

  throw error.value || createError({ statusCode: 500, statusMessage: "Error creating game" })
}
import { Session, PlayerSession } from "~~/types/db"

export default async (session_id: string, username?: string): Promise<{ session?: Session, player?: PlayerSession }> => {

  const { data: { value: session } } = await useFetch<Session>("/api/sessions", { body: { session_id }, method: "POST" })

  if (username) {
    const { data: { value: player } } = await useFetch<PlayerSession>("/api/players", { body: { session_id, username }, method: "POST" })

    return { session: session as Session | undefined, player: player as PlayerSession | undefined }
  }

  return { session: session as Session | undefined }
}
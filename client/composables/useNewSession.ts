import { Session } from "~~/types/db";
import { SessionConfig } from "~~/types/server";

export default async (session_config: SessionConfig): Promise<Session> => {

  const { data: { value }, error } = useFetch<Session>("/api/sessions/create", {
    body: session_config,
    method: "POST"
  })

  if (value) {
    return value
  }

  throw error.value || createError({ statusCode: 500, statusMessage: "Error creating new session" })
}
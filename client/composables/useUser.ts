/* eslint-disable camelcase */
import { User } from "~~/types/db"

import useAuth from "./useAuth"

export default async (user_id?: string): Promise<User | null> => {
  if (user_id) {
    const { data } = await useFetch<User>("/api/users", { body: user_id, method: "POST" })

    return data.value

  } else {
    const auth_cookie = useAuth().value
    const user = useState<User | null>("user")

    if (auth_cookie && !user.value) {
      const cookieHeaders = useRequestHeaders(["cookie"])

      const { data } = await useFetch<User>("/api/auth", {
        headers: cookieHeaders as HeadersInit
      })

      user.value = data.value
    }

    return user.value
  }
}
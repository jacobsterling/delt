/* eslint-disable camelcase */
import { User } from "~~/types/db"

import useAuth from "./useAuth"

export default async (): Promise<User | null> => {
  const auth_cookie = useAuth().value
  const user = useState<User | null>("user")

  if (auth_cookie && !user.value) {
    const cookieHeaders = useRequestHeaders(["cookie"])

    const { data } = await useFetch<User>("/api/auth/get", {
      headers: cookieHeaders as HeadersInit
    })

    user.value = data.value
  }

  return user.value
}

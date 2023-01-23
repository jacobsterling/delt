import { User } from "~~/types/db"

export default async (username_email: string, password: string): Promise<User> => {

  const { data, error } = await useFetch<User>("/api/auth/login", { body: { password, username_email }, method: "POST" })

  if (data.value) {
    useState("user").value = data.value
    return data.value
  }

  throw error.value?.data || createError({ statusCode: 500, statusMessage: "Error logging in" });
}

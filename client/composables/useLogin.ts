import { User } from "~~/types/db"

export default async (usernameOrEmail: string, password: string) => {
  const result = await useFetch<User>("/api/auth/login", { body: { password, usernameOrEmail }, method: "POST" })

  useState("user").value = result
}

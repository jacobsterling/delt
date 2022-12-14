import { NewUser, User } from "~~/types/db"

export default async (id: string, password: string, email: string): Promise<User | null> => {
  const { data } = await useFetch<User>("/api/auth/register", {
    body: {
      email,
      id,
      password
    } as NewUser,
    method: "POST"
  })

  if (data.value) {
    useState("user").value = data.value
  }

  return data.value
}

import { User } from "~~/types/db"

export default async (search_string?: string): Promise<User[]> => {

  const { data, error } = await useFetch<User[]>("/api/users/search", { body: search_string, method: "POST" })

  if (data.value) {
    return data.value
  }

  throw error.value || new Error("Error fetching users")
}
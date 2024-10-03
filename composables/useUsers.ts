import { User } from "~~/types/db"

export default async (search_string?: string, to?: number, from: number = 0): Promise<User[]> => {

  const { data, error } = await useFetch<User[]>("/api/users/search", { body: { search_string, to, from }, method: "POST" })

  if (data.value) {
    return data.value
  }

  throw error.value || new Error("Error fetching users")
}
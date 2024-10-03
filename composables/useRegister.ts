import { User } from "~~/types/db"

export default async (id: string, password: string, email: string): Promise<User> => {
  const { data, error } = await useFetch<User>("/api/auth/register", {
    body: {
      email,
      id,
      password
    },
    method: "POST"
  })

  if (data.value) {
    useState("user").value = data.value
    return data.value
  }

  throw error.value?.data || createError({ statusCode: 500, statusMessage: "Error registering user" });

}

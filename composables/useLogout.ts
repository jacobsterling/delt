
export default async (): Promise<void> => {
  await useFetch("/api/auth/logout")
  useState("user").value = null
}

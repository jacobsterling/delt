
export const useUser = async (uid: any) => {

  const username = ref<string>("")

  if (uid) {

    const client = useSupabaseClient()

    try {
      const { data, error } = await client.from("usernames").select("*").eq("id", uid).single()
      if (error) { throw error }
      username.value = data.username

      // return other username data (account type ?)

    } catch (error) {
      console.log(error)
    }
  }

  return {
    username: username.value
  }
}
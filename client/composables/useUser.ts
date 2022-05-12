
export const useUser = async (uid: any) => {
  const username = ref<string>(undefined)
  const type = ref<string>(undefined)
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
    type: type.value,
    username: username.value
  }
}

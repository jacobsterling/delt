
export const useUsername = async (username: any) => {
  const type = ref<string>(undefined)
  const account = ref<string>(undefined)
  const file = ref<Blob>(undefined)
  const imageURL = ref<Object>(undefined)
  const client = useSupabaseClient()

  const getProfilePicture = async (username: string) => {
    const { data: download, error } = await client
      .storage
      .from("avatars")
      .download(`${username}.jpg`)
    file.value = download
    if (error) {
      console.log(error)
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      imageURL.value = event.target.result
    }
    reader.readAsDataURL(file.value)
  }

  try {
    const { data, error } = await client.from("account").select("*").eq("username", username).single()
    if (error) { throw error }
    type.value = data.type
    account.value = data.account

    await getProfilePicture(username)

    // return other username data (account type ?)
  } catch (error) {
    console.log(error)
  }

  return {
    account: account.value,
    imageURL: imageURL.value,
    type: type.value
  }
}

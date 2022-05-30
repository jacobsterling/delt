
export const useAccount = async (account: string) => {
  const username = ref<string>(undefined)
  const userSlug = ref<string>(undefined)
  const type = ref<string>(undefined)
  const file = ref<Blob>(undefined)
  const imageURL = ref<Object>(undefined)
  const level = ref<number>(undefined)
  const client = useSupabaseClient()

  const getProfilePicture = async (username: string) => {
    const { data: download, error } = await client
      .storage
      .from("designs")
      .download(`${username}.jpg`)
    file.value = download
    if (error) {
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      imageURL.value = event.target.result
    }
    reader.readAsDataURL(file.value)
  }

  const { data: userData } = await client.from("accounts").select("*").eq("account", account).single()

  if (!userData) {
    await client
      .from("accounts")
      .insert([
        {
          account
        }
      ])
    const { data: newUserData } = await client.from("accounts").select("*").eq("account", account).single()
    type.value = newUserData.type
    level.value = newUserData.level
  } else {
    username.value = userData.username
    userSlug.value = userData.userSlug
    type.value = userData.type
    level.value = userData.level
  }

  if (username.value) { await getProfilePicture(username.value) }

  return {
    imageURL: imageURL.value,
    level: level.value,
    type: type.value,
    userSlug: userSlug.value,
    username: username.value
  }
}

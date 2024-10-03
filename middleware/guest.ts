
export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const user = await useUser()

  if (user !== null && user !== undefined) {
    return navigateTo("/")
  }
})


export default defineNuxtRouteMiddleware(async (_to) => {
  const user = await useUser()

  if (user !== null && user !== undefined) {
    return "/"
  }
})

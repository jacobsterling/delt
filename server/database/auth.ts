import { v4 } from "uuid";
import prisma, { errorHandler } from ".";

export const authById = async (user_id: string) => {
  try {
    return await prisma.user_sessions.findFirst({ orderBy: { started_at: "desc" }, where: { user_id }, include: { users: true } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const authByToken = async (auth_token: string) => {
  try {
    return await prisma.user_sessions.findUnique({ where: { auth_token }, include: { users: true } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const createAuth = async (user_id: string) => {
  try {

    let auth_token = v4().replaceAll("-", "")

    while (await authByToken(auth_token)) {
      auth_token = v4().replaceAll("-", "")
    }

    return await prisma.user_sessions.create({ data: { user_id: user_id, auth_token } })

  } catch (e) {
    throw errorHandler(e)
  }
}
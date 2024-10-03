import { hash } from "bcrypt"
import prisma, { errorHandler } from "."

export const sessionById = async (id: string) => {
  try {
    return await prisma.sessions.findUnique({ where: { id }, include: { whitelist: true } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const sessionsByGame = async (game_id: string) => {
  try {
    return await prisma.sessions.findMany({ where: { game_id }, include: { whitelist: true } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const createSession = async (game_id: string, creator: string, state: any, priv: boolean, pool_id?: string, password?: string) => {
  try {
    return await prisma.sessions.create({ data: { game_id, password: password ? await hash(password, 10) : undefined, private: priv, creator, pool_id, state } })

  } catch (e) {
    throw errorHandler(e)
  }
}


export const createWhitelist = async (session_id: string, user_id: string) => {
  try {
    return await prisma.whitelist.create({ data: { session_id, user_id } })

  } catch (e) {
    throw errorHandler(e)
  }
}
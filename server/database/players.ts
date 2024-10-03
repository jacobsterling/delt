import prisma, { errorHandler } from "."

export const playersBySession = async (session_id: string) => {
  try {
    return await prisma.player_sessions.findMany({ orderBy: { created_at: "desc" }, where: { session_id } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const playerSessionsByGame = async (user_id: string, game_id: string) => {
  try {
    return await prisma.player_sessions.findMany({ where: { user_id, sessions: { game_id } } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const sessionsByPlayer = async (user_id: string) => {
  try {
    return await prisma.player_sessions.findFirst({ orderBy: { created_at: "desc" }, where: { user_id }, include: { sessions: true } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const playerSession = async (user_id: string, session_id: string) => {
  try {
    return await prisma.player_sessions.findFirst({ orderBy: { created_at: "desc" }, where: { user_id, session_id } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const createPlayerSession = async (user_id: string, session_id: string) => {
  try {
    return await prisma.player_sessions.create({ data: { user_id, session_id } })

  } catch (e) {
    throw errorHandler(e)
  }
}
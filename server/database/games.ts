import prisma, { errorHandler } from "."

export const gameById = async (id: string) => {
  try {
    return await prisma.games.findUnique({ where: { id } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const searchGames = async (search_string: string) => {
  try {
    return await prisma.games.findMany({ where: { id: { contains: search_string } } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const allGames = async () => {
  try {
    return await prisma.games.findMany()
  } catch (e) {
    throw errorHandler(e)
  }
}

export const createGame = async (id: string, creator: string, config: any, expiry?: Date) => {
  try {
    return await prisma.games.create({ data: { id, config, expiry, creator } })

  } catch (e) {
    throw errorHandler(e)
  }
}
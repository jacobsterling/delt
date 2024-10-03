import prisma, { errorHandler } from "."

export const poolRefById = async (id: string) => {
  try {
    return await prisma.pools.findUnique({ where: { id } })

  } catch (e) {
    throw errorHandler(e)
  }
}


export const createPoolRef = async (id: string) => {
  try {
    return await prisma.pools.create({ data: { id } })

  } catch (e) {
    throw errorHandler(e)
  }
}

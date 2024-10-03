
import { hash } from "bcrypt";
import prisma, { errorHandler } from ".";

export const userByEmail = async (email: string) => {
  try {
    return await prisma.users.findUnique({ where: { email } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const userById = async (id: string) => {
  try {
    return await prisma.users.findUnique({ where: { id } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const usersBySearch = async (search_string: string, to: number, from: number = 0) => {
  try {
    return await prisma.users.findMany({ where: { id: { contains: search_string } }, take: to - from + 1, skip: from })
  } catch (e) {
    throw errorHandler(e)
  }
}

export const allUsers = async () => {
  try {
    return await prisma.users.findMany() || []
  } catch (e) {
    throw errorHandler(e)
  }
}

export const create = async (id: string, email: string, password: string) => {
  try {
    return await prisma.users.create({ data: { email, id, password: await hash(password, 10) } })
  } catch (e) {
    throw errorHandler(e)
  }
}
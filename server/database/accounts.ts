import prisma, { errorHandler } from "."

export const accountById = async (account_id: string) => {
  try {
    return await prisma.accounts.findUnique({ where: { account_id } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const deleteAccount = async (account_id: string) => {
  try {
    return await prisma.accounts.delete({ where: { account_id } })
  } catch (e) {
    throw errorHandler(e)
  }
}

export const updateAccount = async (account_id: string, rewards: any) => {
  try {
    return await prisma.accounts.update({ where: { account_id }, data: { last_active: new Date(), rewards } })
  } catch (e) {
    throw errorHandler(e)
  }
}

export const accountsByUser = async (user_id: string) => {
  try {
    return await prisma.accounts.findMany({ where: { user_id } })

  } catch (e) {
    throw errorHandler(e)
  }
}

export const createAccount = async (account_id: string, user_id: string) => {
  try {
    return await prisma.accounts.create({ data: { account_id, user_id } })

  } catch (e) {
    throw errorHandler(e)
  }
}
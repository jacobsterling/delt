/* eslint-disable camelcase */
import { NewAccount } from "~/types/db"

import prisma from "../client"

export async function getUserByAccount(account_id: string) {
  return await prisma.accounts.findUnique({
    where: {
      account_id
    }
  }).users()
}

export async function getAccountById(account_id: string) {
  return await prisma.accounts.findUnique({
    where: {
      account_id
    }
  })
}

export async function getAccountsByUser(user_id: string) {
  return await prisma.accounts.findMany({
    where: {
      user_id
    }
  })
}

export async function createAccount(data: NewAccount) {
  return await prisma.accounts.create({
    data
  })
}

export async function removeAccount(account_id: string) {
  return await prisma.accounts.delete({
    where: {
      account_id
    }
  })
}

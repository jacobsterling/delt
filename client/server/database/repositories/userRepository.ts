/* eslint-disable camelcase */
import { NewUser } from "~/types/db"

import prisma from "../client"

export async function getUserByEmail(email: string) {
  return await prisma.users.findUnique({
    where: {
      email
    }
  })
}

export async function getUserById(id: string) {
  return await prisma.users.findUnique({
    where: {
      id
    }
  })
}

export async function createUser(data: NewUser) {
  return await prisma.users.create({
    data
  })
}

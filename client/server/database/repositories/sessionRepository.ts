/* eslint-disable camelcase */
import { NewUserSession } from "~~/types/db"

import prisma from "../client"

export async function createSession(data: NewUserSession) {
  prisma.users.update({
    data: {
      last_login: new Date()
    },
    where: {
      id: data.user_id
    }
  })

  return await prisma.user_sessions.create({ data })
}

export async function getSessionByAuthToken(auth_token: string) {
  return await prisma.user_sessions.findUnique({
    where: {
      auth_token
    }
  })
}

export async function getUserByAuthToken(auth_token: string) {
  return await prisma.user_sessions.findUnique({
    where: {
      auth_token
    }
  }).users()
}

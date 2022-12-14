/* eslint-disable camelcase */
import { NewGame } from "~~/types/db"

import prisma from "../client"

export async function getGames() {
  return await prisma.games.findMany({
    where: {
      ended_at: null
    }
  })
}

export async function getGamesByCreator(creator: string) {
  return await prisma.games.findMany({
    where: {
      creator
    }
  })
}

export async function getGameById(id: string) {
  return await prisma.games.findUnique({
    where: {
      id
    }
  })
}

export async function getGameByPool(pool_id: string) {
  return await prisma.games.findUnique({
    where: {
      pool_id
    }
  })
}

export async function createGame(data: NewGame) {
  return await prisma.games.create({
    data
  })
}

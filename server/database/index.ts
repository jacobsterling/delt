import { NuxtError } from "#app"
import { Prisma, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default prisma

export const errorHandler = (e: unknown): NuxtError => {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case "P1001":
        return createError({ name: e.name, statusMessage: "Database cannot be reached", data: e.cause, statusCode: 503, stack: e.stack })

      case "P2002":
        return createError({ name: e.name, statusMessage: "There is a unique constraint violation, database entry cannot be created with given key(s)", data: e.cause, statusCode: 409, stack: e.stack })

      case "P5003":
        return createError({ name: e.name, statusMessage: "Requested resource does not exist", data: e.cause, statusCode: 409, stack: e.stack })

      default:
        return createError({ name: e.name, unhandled: true, statusMessage: e.message, data: e.cause, statusCode: 500, stack: e.stack })
    }
  } else {
    return createError({ unhandled: true, statusMessage: "Database error", data: e, statusCode: 500 })
  }
}

import { z } from "@sidebase/nuxt-parse"

import { User } from "~~/types/db"
import parseBody from "~~/server/app/parse"
import { allUsers, usersBySearch } from "~~/server/database/users"

const body_schema = z.object({
  search_string: z.ostring(),
  from: z.number().int().min(0).default(0),
  to: z.number().int().min(0).optional()
})

export default defineEventHandler<User[] | void>(async (event) => {
  const { search_string, from, to } = await parseBody(event, body_schema)

  try {

    if (!search_string) return await allUsers() as User[]

    return await usersBySearch(search_string, to || from + 20, from) as User[]

  } catch (e: any) {
    return sendError(event, e)
  }
})


import { z } from "@sidebase/nuxt-parse"

import { User } from "~~/types/db"
import parseBody from "~~/server/app/parse"
import { allUsers, usersBySearch } from "~~/server/database/users"

const body_schema = z.ostring()

export default defineEventHandler<User[] | void>(async (event) => {
  const search_string = await parseBody(event, body_schema)

  try {
    return (search_string ? await usersBySearch(search_string) : await allUsers()) as User[]
  } catch (e: any) {
    return sendError(event, e)
  }
})

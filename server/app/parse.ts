
import { z, parseBodyAs } from "@sidebase/nuxt-parse"
import { H3Event } from "h3"

export default async function parseBody<ZodSchema extends z.ZodTypeAny>(event: H3Event, schema: ZodSchema): Promise<z.TypeOf<ZodSchema>> {
  try {
    return await parseBodyAs(event, schema)
  } catch (e: any) {

    const errors: { [cause: string]: string } = {}
    JSON.parse(e.data).forEach((zodError: any) => {
      errors[zodError.path[0]] = zodError.message
    })

    sendError(event, createError({ statusCode: 422, statusMessage: "Invalid Data", data: errors }))
  }
}
import { H3Event } from "h3"

import { getMappedZodErrors } from "../errorMapper"

export default function sendZodErrorResponse(event: H3Event, errorData: any) {
  return sendError(event, createError({ data: getMappedZodErrors(errorData), statusCode: 422, statusMessage: "Invalid Data Provided" }))
}

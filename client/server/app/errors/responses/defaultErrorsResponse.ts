import { H3Event } from "h3"

import { getMappedError } from "../errorMapper"

export default function sendDefaultErrorResponse(event: H3Event, errorType: string, statusCode: number, error: any) {
  return sendError(event, createError({ data: getMappedError(errorType, error), statusCode, statusMessage: "Invalid Data Provided" }))
}

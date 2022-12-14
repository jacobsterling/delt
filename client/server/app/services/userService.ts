/* eslint-disable camelcase */
import { H3Event } from "h3"

import { getUserByEmail, getUserById } from "~/server/database/repositories/userRepository"

import { getUserByAuthToken } from "../../database/repositories/sessionRepository"

export type ExistsCheck = {
  value: boolean
  message?: string
}

export type RegistrationErrors = {
  emailError?: string
  usernameError?: string
}

export async function doesUserExist(email: string, username: string): Promise<ExistsCheck> {
  const hasEmail = await getUserByEmail(email)
  const hasUsername = await getUserById(email)

  const emailExists = hasEmail !== null
  const usernameExists = hasUsername !== null

  const errors: RegistrationErrors = {}

  if (emailExists) {
    errors.emailError = `${email} already is already registered`
  }

  if (usernameExists) {
    errors.usernameError = `${username} already is already registered`
  }

  if (emailExists || usernameExists) {
    const message = JSON.stringify(errors)

    return { message, value: true }
  }

  return { value: false }
}

export async function authCheck(event: H3Event): Promise<boolean> {
  const auth_token = getCookie(event, "auth_token")

  if (!auth_token) {
    return false
  }

  const user = await getUserByAuthToken(auth_token)

  if (user) {
    return true
  }

  return false
}

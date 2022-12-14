/* eslint-disable camelcase */
import { getAccountById } from "~~/server/database/repositories/accountRepository"

export async function doesAccountExist(account_id: string): Promise<boolean> {
  return await getAccountById(account_id) !== null
}

export interface PlayerStats {
  kills: number
  xp_accrual: number
}

export type PlayerInfo = {
  ping: number,
  managed_entities: string[],
  stats: PlayerStats
}

export interface User {
  id: string
  email: string
  created_at?: Date
  last_login?: Date
}

export interface NewUser {
  id: string
  password: string
  email: string
}

export interface UserSession {
  auth_token: string
  user_id: string
  started_at: Date
  ended_at?: Date
  connection_created_at?: Date
  connection_ended_at?: Date
}

export interface NewUserSession {
  auth_token: string
  user_id: string
}

export interface Account {
  account_id: string
  user_id: string
  interactions: number
}

export interface NewAccount {
  account_id: string
  user_id: string
}

export interface Game {
  id: string
  creator: string
  result?: any
  pool_id?: string
  lvl_required: number
  created_at: Date
  ended_at?: Date,
  logs: any
}

export interface NewGame {
  id: string
  creator: string
  pool_id?: string
  lvl_required?: number
}

import { SessionState } from "~~/game/scenes/baseScene"

export interface PlayerStats {
  kills: number
  xp_accrual: number
  death?: Date,
}

export type PlayerInfo = {
  managed_entities: string[],
  stats: PlayerStats
}

export interface User {
  id: string
  email: string
  created_at?: Date
  last_login?: Date
}

export interface UserSession {
  auth_token: string
  user_id: string
  started_at: Date
  ended_at?: Date
}

export interface Account {
  account_id: string
  user_id: string
  last_active?: Date
  rewards: { [time: string]: string }
}

export type GameConfig = {
  player_limit: number
  teams: number
  level_required: number
  session_attempts?: number
  player_attempts?: number
}

export interface Game {
  id: string
  creator: string
  config: GameConfig
  created_at: Date
  ended_at?: Date
  expiry?: Date
}

export interface Session {
  id: string
  game_id: string
  pool_id?: string
  creator: string
  password: boolean
  private: boolean
  players: number
  whitelist?: string[]
  created_at: Date
  started_at?: Date
  ended_at?: Date
  last_update?: Date
  logs: { [time: string]: string }
  state: SessionState
}

export interface PlayerSession {
  session_id: string
  user_id: string
  account_id?: string
  created_at: Date
  ended_at?: Date
  resolved_at?: String
  info?: PlayerInfo
}

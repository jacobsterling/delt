import { SessionState } from "../game/scenes/baseScene"
import { PlayerInfo } from "./db"

export interface ServerUpdate {
  update_type: string,
  update: any,
}

export interface ServerTick {
  tick: number,
  state: SessionState,
  players: { [id: string]: PlayerInfo },
}

export type ServerError = {
  error: any,
  error_type: string
}

export type ServerMessage = {
  content: any,
  msg_type: string
}

export type SessionView = {
  game_id: string,
  creator: string,
  game_creator: string,
  created_at: string,
  started_at: string,
  players: number,
  password: boolean
}

export type SessionConfig = {
  game_id: string
  whitelist?: string[]
  password?: string
  state?: SessionState
};

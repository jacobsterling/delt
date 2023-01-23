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

export type SessionConfig = {
  game_id: string
  whitelist?: string[]
  password?: string
  state?: SessionState
  pool_id?: string
};

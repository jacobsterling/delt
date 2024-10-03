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
  status: SessionStatus
}

export const checkStatus = (status: any): string => {
  if ('starting' in status) {
    return 'starting'
  }

  if ('in_progress' in status) {
    return 'in_progress'
  }

  if ('paused_at' in status) {
    return 'paused'
  }

  return 'post_session'
}

export type SessionStatus = SessionStarting | SessionInProgress | SessionStandby | PostSession
interface SessionStarting {
  starting?: number
}

interface SessionInProgress {
  in_progress: number
}

interface SessionStandby {
  paused_at: Date
  for_duration?: number
  by?: string
}

type PostSession = 'post_session'

export type PlayerStatus = PlayerLoading | PlayerLostConnection | PlayerInProgress | PlayerReady | PlayerEnded

interface PlayerLoading {
  loading_from: Date
}

interface PlayerLostConnection {
  lost_connection_at: Date
}

interface PlayerInProgress {
  for_duration: number
}

type PlayerReady = 'ready'

interface PlayerEnded {
  ended_at: Date
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

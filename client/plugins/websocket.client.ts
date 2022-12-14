/* eslint-disable no-use-before-define */
/* eslint-disable indent */
/* eslint-disable camelcase */

import Phaser from "phaser"

import { EntityConfigs } from "../game/entities"
import Entity from "../game/entities/entity"
import BaseScene, { SessionState } from "../game/scenes/baseScene"
import { PlayerInfo } from "../types/db"
import { ServerError, ServerMessage, ServerTick, ServerUpdate, SessionConfig, SessionView } from "../types/server"

export interface WebSocketConnection {
  connect: () => Promise<{ sessions?: { [id: string]: SessionView }, restored_session?: SessionState }>
  connection?: ActiveConnection
}

export type ConnectionResult = { sessions?: { [id: string]: SessionView }, restored_session?: SessionState }

export default defineNuxtPlugin(() => {
  const websocket = reactive<WebSocketConnection>({
    connect: async () => {
      const user = await useUser()
      const auth_token = useAuth().value

      if (user && auth_token) {
        websocket.connection = new ActiveConnection(user.id, auth_token)
        try {
          const res = await websocket.connection.awaitEvents<ConnectionResult>(["session.connected", "session.joined"])
          return res
        } catch (e) {
          console.error("Connection Error:", e)
          return {}
        }
      }

      console.error("Not logged in")
      return {}
    },
    connection: undefined
  }) as WebSocketConnection

  return {
    provide: {
      websocket
    }
  }
})

export class ActiveConnection extends WebSocket {
  sendMessage(msg: ServerMessage): void {
    this.send(JSON.stringify(msg))
  }

  sendUpdate(update: ServerUpdate): void {
    this.sendMessage({ content: update, msg_type: "update" })
  }

  async awaitEvents<T>(events: string[] = [], timeout = 10000): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      for (const event of events) {
        this.events.once(event, (res: T) => {
          clearTimeout(timer)
          for (const other_event of events.filter(value => value !== event)) {
            this.events.removeListener(other_event, undefined, this, true)
          }
          resolve(res)
        })
      }

      this.events.once("session.error", (res: ServerError) => {
        clearTimeout(timer)
        for (const event of events) {
          this.events.removeListener(event, undefined, this, true)
        }
        reject(new Error(res.error_type))
      })

      const timer = setTimeout(() => {
        for (const event of events) {
          this.events.removeListener(event, undefined, this, true)
        }
        reject(new Error("timout reached waiting for events"))
      }, timeout)
    })
  }

  async create(config: SessionConfig): Promise<{ session_id: string, game_id: string }> {
    this.sendMessage({ content: config, msg_type: "create" })

    return await this.awaitEvents(["session.created"])
  }

  async join(session_id: string, password?: string): Promise<SessionState> {
    this.sendMessage({ content: { password, session_id }, msg_type: "join" })
    return await this.awaitEvents(["session.joined"])
  }

  async leave(): Promise<void> {
    this.sendMessage({ content: undefined, msg_type: "leave" })
    if (this.session) {
      try {
        await this.awaitEvents(["session.ended"])
      } catch (e) {
        console.error("Leave Error: ", e)
      }
    }
  }

  async get(query: { session_id?: string, game_id?: string, host_id?: string } = {}): Promise<{ [id: string]: SessionView }> {
    this.sendMessage({ content: query, msg_type: "sessions" })

    try {
      return await this.awaitEvents(["session.query"])
    } catch (e) {
      console.error("Get Sessions Error: ", e)
      return {}
    }
  }

  update(scene: BaseScene): void {
    if (this.session) {
      const { players, update } = this.session

      for (const id of players[this.username].managed_entities) {
        const entity = scene.children.getByName(id)
        if (entity) {
          update.active[id] = (entity as Entity).getConfig()
        }
      }

      this.sendUpdate({ update, update_type: "entities" })
    }
  }

  username: string

  session?: {
    id: string
    players: { [user_id: string]: PlayerInfo }
    update: { active: { [name: string]: EntityConfigs }, spawns: { [spawn_id: string]: EntityConfigs }, kill_list: string[] }
  }

  events: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter()

  // eslint-disable-next-line space-before-function-paren
  constructor(username: string, auth_token: string) {
    const config = useRuntimeConfig()

    super(`ws://${auth_token}@${config.SERVER_URL}`)

    this.username = username

    this.addEventListener("open", (event: any) => {
      this.events.emit("session.open", event)
    })

    this.addEventListener("close", (event: any) => {
      const { $websocket } = useNuxtApp()
      $websocket.connection = undefined
      this.events.emit("session.close", event)
    })

    this.addEventListener("error", (event: any) => {
      this.events.emit("session.error", event)
    })

    this.addEventListener("message", (event: any) => {
      const { msg_type, content } = JSON.parse(event.data) as ServerMessage

      switch (msg_type) {
        case "tick":
          // eslint-disable-next-line no-case-declarations
          const { tick, players, state } = content as ServerTick

          this.session!.players = players

          this.events.emit("session.tick", state, tick)
          break

        case "update":
          this.events.emit("session.update", content as ServerUpdate)
          break

        case "notification":
          this.events.emit("session.notification", content)
          console.warn(content)
          break

        case "created":
          this.events.emit("session.created", content)
          break

        case "message":
          // eslint-disable-next-line no-case-declarations
          const { sender, msg } = content as { sender: string, msg: string }
          console.info(sender, ": ", msg)
          break

        case "joined":
          // eslint-disable-next-line no-case-declarations
          const { players: init_players, session_id: id, state: init_state } = content as { players: { [id: string]: PlayerInfo }, state: SessionState, session_id: string }
          this.session = { id, players: init_players, update: { active: {}, kill_list: [], spawns: {} } }

          this.events.emit("session.joined", init_state)
          break

        case "ended":
          this.events.emit("session.ended", content.session_id)
          break

        case "left":
          this.events.emit("session.left", content)
          break

        case "disconnected":
          // eslint-disable-next-line no-case-declarations
          const { $websocket } = useNuxtApp()
          $websocket.connection = undefined
          this.events.emit("session.disconnected")
          break

        case "connected":

          this.events.emit("session.connected", content as { [id: string]: SessionView })
          // testing purposes
          break

        case "sessions":
          console.log(content)
          this.events.emit("session.query", content as { [id: string]: SessionView })
          break

        case "error":
          // JSON.parse(content)

          this.events.emit("session.error", content as ServerError)
          break

        default:
          console.warn("Unexpected message: ", event.data)
          break
      }
    })
  }
}

// export interface WebSocketConnection extends WebSocket {
//   sendMessage(msg: ServerMessage): void
//   sendUpdate(update: ServerUpdate): void
//   sendUpdate(update: ServerUpdate): void
//   create(config: SessionConfig): Promise<string | ServerError>
//   join(session_id: string, password?: string): Promise<SessionState | ServerError>
//   leave(): Promise<void>
//   get(query: { session_id?: string, game_id?: string, host_id?: string }): Promise<{ [id: string]: SessionView }>
//   update(scene: BaseScene): void
//   username: string
//   active_session?: {
//     id: string
//     players: { [user_id: string]: PlayerInfo }
//     update: { active: { [name: string]: EntityConfigs }, spawns: { [spawn_id: string]: EntityConfigs }, kill_list: string[] }
//   }
//   events: Phaser.Events.EventEmitter
// }

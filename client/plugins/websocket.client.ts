import Phaser from "phaser"
import { Ref } from "vue"

import { EntityConfigs } from "../game/entities"
import Entity from "../game/entities/entity"
import BaseScene, { SessionState } from "../game/scenes/baseScene"
import { PlayerInfo, PlayerSession } from "../types/db"
import { ServerError, ServerMessage, ServerTick, ServerUpdate } from "../types/server"

export default defineNuxtPlugin(async () => {
  const connection: Ref<WebSocketConnection | undefined> = ref(undefined)

  return {
    provide: {
      websocket: {
        connect: async (): Promise<Ref<WebSocketConnection>> => {
          if (connection.value) {
            return connection as Ref<WebSocketConnection>
          } else {
            const user = await useUser()
            const auth_token = useAuth().value

            if (user && auth_token) {
              const conn = new WebSocketConnection(user.id, auth_token)

              conn.awaitEvents(["session.connected"])

              connection.value = conn

              connection.value.events.on("session.disconnected", () => {
                connection.value = undefined
              })

              return connection as Ref<WebSocketConnection>
            }

            throw createError({ statusCode: 402, statusMessage: "Not Signed In" });
          }
        },
        connection
      } as {
        connect: () => Promise<Ref<WebSocketConnection>>,
        connection: Ref<WebSocketConnection | undefined>
      }
    }
  }
})

export class WebSocketConnection extends WebSocket {
  sendMessage(msg: ServerMessage): void {
    this.send(JSON.stringify(msg))
  }

  sendUpdate(update: ServerUpdate): void {
    this.sendMessage({ content: update, msg_type: "update" })
  }

  async awaitEvents<T>(events: string[] = [], timeout: number | undefined = 10000): Promise<T> {
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
        reject(createError({ statusMessage: res.error_type, data: res.error }))
      })

      const timer = setTimeout(() => {
        for (const event of events) {
          this.events.removeListener(event, undefined, this, true)
        }
        reject(createError({ statusCode: 408, statusMessage: "Request Timeout" }))
      }, timeout)
    })
  }

  async join(session_id: string, account_id?: string, password?: string): Promise<SessionState> {

    const { data, error } = await useFetch<PlayerSession>("/api/sessions/join", {
      body: {
        session_id,
        account_id,
        password
      },
      method: "POST"
    })

    if (data.value) {
      this.sendMessage({ content: { session_id }, msg_type: "join" })

      return await this.awaitEvents<SessionState>(["session.joined"])
    }

    throw error.value?.data || createError({ statusCode: 500, statusMessage: "Error joining session" });
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
    state: SessionState,
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
          this.session!.state = state

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
          this.session = { id, players: init_players, state: init_state, update: { active: {}, kill_list: [], spawns: {} } }

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
          $websocket.connection.value = undefined
          this.events.emit("session.disconnected")
          break

        case "connected":

          this.events.emit("session.connected")
          // testing purposes
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
/* eslint-disable no-tabs */
/* eslint-disable no-new */
/* eslint-disable indent */
import Phaser, { Game } from "phaser"
import { AffectorConfig } from "~~/../delt/entities/affector"
import { EntityConfig } from "~~/../delt/entities/entity"
import Player, { PlayerConfig } from "~~/../delt/entities/player"

import GameUi from "../../delt/scenes/gameUi"
import MainScene, { getRandom } from "../../delt/scenes/mainScene"
import Preloader from "../../delt/scenes/preloader"
import DebugConfig from "./config.Debug.json"
import Config from "./config.json"

export type gameConfig = {
  game_id?: string
  privite?: boolean
  whitelist?: []
  password?: string
  data?: {}
  autoconnect?: PlayerConfig
};

export interface Multiplayer {
  broadcast: boolean
  broadcastMessage: (msg_type: string, data: { [id: string]: any }) => void
  events: Phaser.Events.EventEmitter;
  socket?: WebSocket
  self_id?: string
  games: { [id: string]: any } // game browser
  game?: { // connected game
    game_id: string
    host_id: string
    players: { [id: string]: Player }
    game_state: { [id: string]: any }
  }

  accountId?: string,

  register: (accountId: string) => void,

  joinGame: (gameId: string) => void //, selfData: PlayerConfig

  isHost: (id?: string) => boolean

  leaveGame: () => void //, selfData: PlayerConfig

  createGame: (gameConfig: gameConfig) => void

  connect: (accountId?: string, url?: string) => void

  onSocketMessage: (event: any) => void

  onSocketOpen: (event: any) => void

  onSocketError: (event: any) => void

  onSocketClose: (event: any) => void

  broadcastSelf: (self: Player) => void

  getGames: () => void,
}

export interface Delt {
  game?: Game // self game instance
  config: Phaser.Types.Core.GameConfig,
  debugConfig: Phaser.Types.Core.GameConfig,
  visible: boolean,
  launch: (containerId: string, debug: boolean) => void
  insertPlugin: (key: string, className: Class, debug: boolean) => void
  multiplayer: Multiplayer
}

export default defineNuxtPlugin(() => {
  const delt = reactive<Delt>({

    config: Config,

    debugConfig: DebugConfig,

    game: undefined,

    insertPlugin: (key: string, className: Class, debug: boolean = false) => {
      let config = delt.config
      if (debug) {
        config = delt.debugConfig
      }

      if (checkIsPluginObject(config)) {
        const plugin = config.global?.find((x: Phaser.Types.Core.PluginObjectItem) => x.key === key)
        if (plugin) {
          plugin.plugin = className
        }
      }
    },

    launch: (containerId, debug: boolean) => {
      let config = delt.config
      if (debug) {
        config = delt.debugConfig
      }
      config.scene = [Preloader, MainScene, GameUi]
      config.scale = {
        // Center vertically and horizontally
        autoCenter: Phaser.Scale.CENTER_BOTH,
        // Fit to window
        mode: Phaser.Scale.FIT
      }
      config.parent = containerId
      delt.game = new Phaser.Game(config as Phaser.Types.Core.GameConfig)
    },

    multiplayer: {
      accountId: undefined,
      broadcast: false,
      broadcastMessage: (msgType: string, data: { [id: string]: any }) => {
        data.msg_type = msgType// used to inforce a msg_type
        if (delt.multiplayer.socket) {
          delt.multiplayer.socket.send(JSON.stringify(data))
        }
      },

      broadcastSelf: (self: Player) => {
        if (delt.multiplayer.broadcast && delt.multiplayer.self_id && delt.game) {
          delt.multiplayer.broadcastMessage("update", { self: extractEntityFeatures(self) })
        }
      },

      connect: (accountId?: string, url: string = "ws://127.0.0.1:42069") => { //  ws://80.41.27.54:32323
        delt.multiplayer.socket = new WebSocket(url)
        delt.multiplayer.socket.addEventListener("open", delt.multiplayer.onSocketOpen.bind(this))
        delt.multiplayer.socket.addEventListener("message", delt.multiplayer.onSocketMessage.bind(this))
        delt.multiplayer.socket.addEventListener("close", delt.multiplayer.onSocketClose.bind(this))
        delt.multiplayer.socket.addEventListener("error", delt.multiplayer.onSocketError.bind(this))

        if (accountId) {
          delt.multiplayer.events.once("socket.connected", () => {
            delt.multiplayer.register(accountId)
          })
        }
      },

      createGame: (config: gameConfig) => {
        delt.multiplayer.broadcastMessage("create", config)

        delt.multiplayer.events.on("game.created", (gameId: string) => {
          console.warn(gameId, " created.")
          if (config.autoconnect) { delt.multiplayer.joinGame(gameId) } // config.autoconnect
        }
        )
      },

      events: new Phaser.Events.EventEmitter(),
      game: undefined,
      games: {},

      getGames: () => {
        delt.multiplayer.broadcastMessage("list", {})
      },

      isHost: (id?: string) => {
        if (delt.multiplayer.game && delt.multiplayer.self_id) {
          if (id) {
            return delt.multiplayer.game.host_id === id
          } else {
            return delt.multiplayer.game.host_id === delt.multiplayer.self_id
          }
        } else {
          return true
        }
      },

      joinGame: (gameId: string) => { // , selfData: PlayerConfig
        const selfData: PlayerConfig = {
          attackSpeed: 3,
          hp: 100,
          speed: 200,
          type: "wizard",
          x: getRandom(100, 400),
          y: getRandom(100, 400)
        }

        delt.multiplayer.broadcastMessage("join", { data: selfData, game_id: gameId })
      },

      leaveGame: () => {
        delt.multiplayer.broadcastMessage("leave", {})
      },

      onSocketClose: (_event: any) => {
        delt.multiplayer.game = undefined
        if (delt.game) {
          delt.game.scene.start("Preloader")
        }
      },

      onSocketError: (_event: any) => { },

      onSocketMessage: (event: any) => {
        const res = deserializeJsonResponse(event.data ?? "")
        if (res == null) { return }

        switch (res?.msg_type) {
          case "notification":
            delete res.msg_type
            console.warn(res?.msg)
            break

          case "registered":
            delete res.msg_type
            delt.multiplayer.accountId = res.account_id
            delt.multiplayer.events.emit("socket.registered")

            // testing purposes
            delt.multiplayer.createGame({
              game_id: "vans dungeon"
            })
            break
          // used for temp object creation
          case "spawn":
            delete res.msg_type
            delt.multiplayer.events.emit("game.spawn", extractAffectorFeatures(res.spawn), res?.spawer)
            break

          case "despawn":
            delete res.msg_type
            delt.multiplayer.events.emit("game.despawn", res?.spawn_id)
            break

          case "affect":
            delete res.msg_type

            delt.multiplayer.events.emit("game.affect", res?.affected_id, res?.affector_id)
            break

          case "update":
            delete res.msg_type
            // const server_tick_duration = res.tick as number

            Object.entries(res).forEach(([key, element]) => {
              switch (key) {
                case "entities":
                  Object.entries(Object(element)).forEach(([id, entity]) => {
                    delt.multiplayer.events.emit("entity.update", id, extractEntityFeatures(entity))
                  })
                  break

                case "players":
                  Object.entries(Object(element)).forEach(([id, player]) => {
                    delt.multiplayer.events.emit("player.update", id, extractEntityFeatures(player))
                  })
                  break

                case "game_state":
                  if (delt.multiplayer.game) {
                    delt.multiplayer.game.game_state = Object.assign(delt.multiplayer.game.game_state, element)
                    delt.multiplayer.events.emit("game.update", delt.multiplayer.game.game_state)
                  }
                  // have object.create in here when difference in game data
                  break

                default:
                  break
              }
            })

            break

          case "joined":
            console.warn(res?.msg)
            delt.multiplayer.self_id = res?.id
            delt.multiplayer.game = {
              game_id: res.game_id,
              game_state: {},
              host_id: res.host_id,
              players: {}
            }
            delt.game.scene.start("MainScene", { multiplayer: delt.multiplayer })
            delt.visible = true
            break

          case "created":
            delt.multiplayer.events.emit("game.created", res?.game_id)
            break

          case "left":
            if (res.id === delt.multiplayer.self_id) {
              delt.multiplayer.events.emit("game.left", delt.multiplayer.game.game_id)
              delt.multiplayer.broadcast = false
              delt.multiplayer.game = undefined
              delt.game.scene.start("Preloader")
              console.warn(res.game_id, " left.")
            } else {
              console.warn(res.msg)
              delt.multiplayer.events.emit("player.destroy", delt.multiplayer.game.players[res.id])
              delete delt.multiplayer.game.players[res.id]
            }
            break

          case "info":
            delete res.msg_type
            // eslint-disable-next-line no-case-declarations
            delt.multiplayer.games[res.game_id] = res
            delt.multiplayer.events.emit("game.added", res.game_id)
            break

          case "ended":
            delt.game.scene.start("Preload")
            delt.multiplayer.game = undefined
            delt.multiplayer.events.emit("game.ended", delt.multiplayer.game.game_id)
            break

          case "connected":
            delt.multiplayer.events.emit("socket.connected")
            break

          case "error":
            console.warn(res?.msg)
            delt.multiplayer.events.emit("socket.error", res?.msg)

            //  temporary for testing 2 players
            if (res?.msg === "Account id already registered") {
              delt.multiplayer.register("darkholme.near")
            }

            break

          case "msg":
            console.info(res?.msg)
            delt.multiplayer.events.emit("message.recieved", res?.msg)
            break

          default:
            // console.warn("Unexpected message", data?.msg)
            break
        }
      },

      onSocketOpen: (_event: any) => { },

      register: (accountId: string) => {
        delt.multiplayer.broadcastMessage("register", { account_id: accountId })
        delt.multiplayer.events.once("socket.registered", () => {
          delt.multiplayer.accountId = accountId
        })
      },

      self_id: undefined,
      socket: undefined
    },

    visible: false
  }) as Delt

  return {
    provide: {
      delt
    }
  }
})

const deserializeJsonResponse = (data: string) => {
  try {
    return JSON.parse(data)
  } catch {
    console.error(`Did not receive JSON. Insead, received '${data}'`)
    return null
  }
}

const checkIsPluginObject = (obj: any): obj is Phaser.Types.Core.PluginObject =>
// eslint-disable-next-line indent
(((<Phaser.Types.Core.PluginObject>obj).global !== undefined) &&
  ((<Phaser.Types.Core.PluginObject>obj).global?.length ?? 0) > 0)

export const extractAffectorFeatures = (affector: any) => {
  const features: AffectorConfig = {
    affects: affector.affects,
    direction: affector.direction,
    height: affector.height,
    id: affector.id,
    speed: affector.speed,
    texture: affector.texture,
    type: affector.type,
    width: affector.width,
    x: affector.x,
    y: affector.y
  }

  return features
}

export const extractEntityFeatures = (entity: any) => {
  const features: EntityConfig = {
    attackSpeed: entity.attackSpeed,
    hp: entity.hp,
    name: entity.name,
    speed: entity.speed,
    type: entity.type,
    x: entity.x,
    y: entity.y
  }

  return features
}

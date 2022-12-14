/* eslint-disable camelcase */

import Phaser from "phaser"

import BaseScene, { SessionState } from "~~/game/scenes/baseScene"
import { Game } from "~~/types/db"

import GameUi from "../game/scenes/gameUi"
import Preloader from "../game/scenes/preloader"

const config: Phaser.Types.Core.GameConfig = {
  height: 1080,
  physics: {
    default: "arcade"
  },
  pixelArt: true,
  render: {
    antialias: false,
    pixelArt: true
  },
  scale: {
    // Center vertically and horizontally
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Fit to window
    mode: Phaser.Scale.FIT
  },
  scene: [Preloader, GameUi, BaseScene],
  type: 0,
  width: 1920
}
export interface GameManager {
  launch: (container: string, debug?: boolean) => Phaser.Game
  initilize: (state: SessionState) => void
  get: () => Promise<Game[]>
  create: (id: string, lvl_required?: number, pool_id?: string) => Promise<Game | null>
  game?: Phaser.Game
}

export default defineNuxtPlugin(() => {
  // process.env = useRuntimeConfig()
  const manager = reactive<GameManager>({
    create: async (id: string, lvl_required?: number, pool_id?: string) => {
      const { data } = await useFetch<Game>("/api/game/create", {
        body: { id, lvl_required, pool_id },
        method: "POST"
      })

      return data.value
    },
    game: undefined,
    get: async () => {
      const { data } = await useFetch<Game[]>("/api/game/get")

      return data.value ? data.value : []
    },
    initilize: (state: SessionState) => {
      const { $websocket } = useNuxtApp()

      manager.game!.scene.start("BaseScene", { session: $websocket.connection, state })
    },
    launch: (container: string, debug = false) => {
      if (debug) {
        config.physics!.arcade = {
          debug: true,
          debugShowBody: true
        }
      }

      config.parent = container

      manager.game = new Phaser.Game(config)

      return manager.game
    }
  }) as GameManager
  return {
    provide: {
      manager
    }
  }
})

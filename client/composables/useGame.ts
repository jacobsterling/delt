import Phaser from "phaser"

import BaseScene, { SessionState } from "~~/game/scenes/baseScene"

import GameUi from "../game/scenes/gameUi"
import Preloader from "../game/scenes/preloader"

//manager.game!.scene.start("BaseScene")

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

export default (container: string, debug = false): Phaser.Game => {
  if (debug) {
    config.physics!.arcade = {
      debug: true,
      debugShowBody: true
    }
  }

  config.parent = container

  return new Phaser.Game(config)
}
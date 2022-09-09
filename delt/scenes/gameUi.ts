import Phaser from "phaser"
import Controls from "../components/controls"
import PlayerUi from "../components/playerUi"
import Entity from "../entities/entity"
import Player from "../entities/player"
import DynamicTxt, { DynamicTxtConfig } from "../components/dynamicTxt"
import ComponentService from "../components/componentService"
import MainScene, { getRandom } from "./mainScene"

export default class GameUi extends Phaser.Scene {
  public player!: Player
  public mainscene!: MainScene
  public components!: ComponentService

  constructor() {
    super({ key: "GameUi" })
  }

  init(data: any) {
    this.player = data.player as Player
    this.mainscene = this.scene.get("MainScene") as MainScene

    this.components = new ComponentService()

    this.components.addComponent(this.player, new Controls(this))
    this.components.addComponent(this.player, new PlayerUi(this))
  }

  preload() { }

  create() {
    this.mainscene.events.on("entity.damaged", (entity: Entity, mod: number) => {
      this.damageNumbers(entity, mod)
      if (this.mainscene.multiplayer.game?.players[entity.name]) {
        entity.emit("player.damaged", mod)
      }
    },
      this)
  }

  damageNumbers(entity: Entity, mod: number) {
    const { x, y } = entity.getTopCenter()

    var ax = getRandom(10, 70)
    const ay = getRandom(20, 50)

    var vx = getRandom(0, 50)
    const vy = getRandom(-10, -70)

    var color = "#FF0000"

    //heals
    if (mod > 0) {
      ax = -ax
      vx = -vx
      color = "#00FF00"
    }

    const config: DynamicTxtConfig = {
      x,
      y,
      txt: mod.toString(),
      lifetime: 1000,
      movement: {
        velocity: new Phaser.Math.Vector2(vx, vy),
        acceleration: new Phaser.Math.Vector2(ax, ay)
      },
      style: {
        color,
        fontSize: "17px"
      }
    }

    new DynamicTxt(this, config)
  }

  public update = (t: number, dt: number) => {
    this.components.update(dt)
  }
}
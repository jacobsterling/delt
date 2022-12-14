/* eslint-disable no-new */

import { IComponent } from ".."
import Entity from "../../entities/entity"
import { getRandom } from "../../scenes/baseScene"
import GameUi from "../../scenes/gameUi"
import DynamicTxt, { DynamicTxtConfig } from "../dynamicTxt"

export default class EntityUi implements IComponent {
  public entity!: Entity
  public scene: GameUi
  public entityHpBar !: Phaser.GameObjects.Rectangle
  public lifetime !: Phaser.Time.TimerEvent

  constructor(scene: GameUi) {
    this.scene = scene
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.entity = go as Entity

    const { x, y } = this.scene.getRelativePositionToCanvas(this.entity.getBottomCenter())

    this.entityHpBar = this.scene.add.rectangle(x, y + 20, this.entity.width, 5, 0x008000).setVisible(false)

    this.entity.on("entity.hp.changed", (mod: number) => {
      if (mod !== this.entity.getAttributes().max_hp) {
        this.damageNumbers(mod)
      }
      this.setEntityHpBar(this.entity.getAttributes().hp)
    })
  }

  private setEntityHpBar(value: number) {
    this.entityHpBar.setVisible(true)
    const percent = Phaser.Math.Clamp(value / this.entity.getAttributes().max_hp, 0, 1)
    this.entityHpBar.width = this.entity.width * percent
    if (this.lifetime) {
      this.lifetime.destroy()
    }
    this.lifetime = this.scene.time.addEvent({
      callback: () => {
        this.entityHpBar.setVisible(false)
      },
      delay: 2000
    })
  }

  private damageNumbers(mod: number) {
    const { x, y } = this.entity.getTopCenter()

    let ax = getRandom(10, 70)
    const ay = getRandom(20, 50)

    let vx = getRandom(0, 50)
    const vy = getRandom(-10, -70)

    let color = "#FF0000"

    // heals
    if (mod > 0) {
      ax = -ax
      vx = -vx
      color = "#00FF00"
    }

    const config: DynamicTxtConfig = {
      lifetime: 1000,
      movement: {
        acceleration: new Phaser.Math.Vector2(ax, ay),
        velocity: new Phaser.Math.Vector2(vx, vy)
      },
      style: {
        color,
        fontSize: "17px"
      },
      txt: mod.toString(),
      x,
      y
    }

    new DynamicTxt(this.scene.mainscene, config)
  }

  update(dt: number) {
    const { x, y } = this.scene.getRelativePositionToCanvas(this.entity.getBottomCenter())
    this.entityHpBar.setX(x)
    this.entityHpBar.setY(y + 20)
  }
}

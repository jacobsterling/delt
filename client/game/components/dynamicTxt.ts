
import GameUi from "~~/game/scenes/gameUi"

import { IComponent } from "."

export type DynamicTxtConfig = {
  x: number,
  y: number,
  txt: string,
  movement?: {
    velocity: Phaser.Math.Vector2,
    acceleration?: Phaser.Math.Vector2
  }
  lifetime?: number
  style: Phaser.Types.GameObjects.Text.TextStyle,
}

export default class DynamicTxt extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, config: DynamicTxtConfig) { // pass scene you want text to move relative too
    super(scene, config.x, config.y, "sprite")

    this.setVisible(false)
    scene.physics.add.existing(this)

    const ui = this.scene.scene.get("GameUi") as GameUi

    const { x, y } = ui.getRelativePositionToCanvas(this.getCenter())

    const txt = ui.add.text(x, y, config.txt, config.style).setVisible(false)

    ui.components.addComponent(this, new MoveTxt(txt))

    if (config.lifetime) {
      const tint = txt.tint

      this.scene.time.addEvent({
        callback: () => {
          this.destroy()
        },
        delay: config.lifetime
      })
      this.scene.time.addEvent({
        callback: () => {
          txt.tint = txt.tint - tint / 10// doesnt rly work, want to decrease opacity
        },
        delay: config.lifetime,
        repeat: 10
      })
    }

    if (config.movement) {
      const { x: vx, y: vy } = config.movement.velocity
      this.setVelocity(vx, vy)
      console.log(vx, vy)
      if (config.movement.acceleration) {
        const { x: ax, y: ay } = config.movement.acceleration

        this.setAcceleration(ax, ay)
      }
    }

    this.on("destroy", () => {
      this.body.destroy()
      txt.destroy()
    })
  }
}

class MoveTxt implements IComponent {
  public body!: DynamicTxt
  public text!: Phaser.GameObjects.Text

  constructor(txt: Phaser.GameObjects.Text) {
    this.text = txt
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.body = go as DynamicTxt
    this.text.setVisible(true)
  };

  update(_dt: number) {
    if (this.body) {
      const { x, y } = (this.text.scene as GameUi).getRelativePositionToCanvas(this.body.getCenter())
      this.text.setPosition(x, y)
    }
  };
}

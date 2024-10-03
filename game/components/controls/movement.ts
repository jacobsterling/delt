import "phaser"
import { IComponent } from ".."
import Entity from "../../entities/entity"

export default class Movement implements IComponent {
  public entity!: Entity
  public position!: Phaser.Math.Vector2

  public init = (go: Phaser.Physics.Arcade.Sprite) => {
    this.entity = go as Entity
    this.position = new Phaser.Math.Vector2(go.x, go.y)

    const display = this.entity.getFeatures().display

    this.entity.anims.create({
      frameRate: 10,
      frames: [{ frame: 0, key: display.texture }],
      key: "down",
      repeat: -1
    })

    this.entity.anims.create({
      frameRate: 10,
      frames: [{ frame: 1, key: display.texture }],
      key: "up",
      repeat: -1
    })

    this.entity.anims.create({
      frameRate: 100,
      frames: this.entity.anims.generateFrameNumbers(display.texture, {
        end: 3, start: 2
      }),
      key: "right",
      repeat: -1
    })

    this.entity.anims.create({
      frameRate: 100,
      frames: this.entity.anims.generateFrameNumbers(display.texture, {
        end: 5, start: 4
      }),
      key: "left",
      repeat: -1
    })

    this.entity.anims.create({
      frameRate: 20,
      frames: [{ frame: 6, key: display.texture }],
      key: "fire-right",
      repeat: -1
    })

    this.entity.anims.create({
      frameRate: 20,
      frames: [{ frame: 7, key: display.texture }],
      key: "fire-left",
      repeat: -1
    })

    this.entity.anims.create({
      duration: 2000,
      frames: this.entity.anims.generateFrameNumbers(display.texture, {
        end: 11, start: 8
      }),
      key: "death"
    })
  }

  public update = (dt: number) => {
    const { x, y } = this.position

    const vx = Phaser.Math.GetSpeed(this.entity.x - x, dt)
    const vy = Phaser.Math.GetSpeed(this.entity.y - y, dt)

    if (vx !== 0) {
      if (vx > 0) {
        this.entity.play("right", true)
      } else {
        this.entity.play("left", true)
      }
    } else if (vy != 0) {
      if (vy > 0) {
        this.entity.play("down", true)
      } else {
        this.entity.play("up", true)
      }
    } else {
      this.entity.anims.pause()
    }

    this.position = new Phaser.Math.Vector2(this.entity.x, this.entity.y)
  }
}

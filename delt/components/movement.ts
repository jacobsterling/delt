import "phaser";
import Entity from "../entities/entity";
import { IComponent } from "../services/componentService"

export default class Movement implements IComponent {
  public entity!: Entity
  public position!: Phaser.Math.Vector2;

  public init = (go: Phaser.Physics.Arcade.Sprite) => {
    this.entity = go as Entity
    this.position = new Phaser.Math.Vector2(go.x, go.y)

    this.entity.anims.create({
      key: "down",
      frames: [{ key: this.entity.type, frame: 0 }],
      frameRate: 10,
      repeat: -1
    })

    this.entity.anims.create({
      key: "up",
      frames: [{ key: this.entity.type, frame: 1 }],
      frameRate: 10,
      repeat: -1
    })

    this.entity.anims.create({
      key: "right",
      frames: this.entity.anims.generateFrameNumbers(this.entity.type, {
        start: 2, end: 3
      }),
      frameRate: 100,
      repeat: -1
    })

    this.entity.anims.create({
      key: "left",
      frames: this.entity.anims.generateFrameNumbers(this.entity.type, {
        start: 4, end: 5
      }),
      frameRate: 100,
      repeat: -1
    })

    this.entity.anims.create({
      key: "fire-right",
      frames: [{ key: this.entity.type, frame: 6 }],
      frameRate: 20,
      repeat: -1
    })

    this.entity.anims.create({
      key: "fire-left",
      frames: [{ key: this.entity.type, frame: 7 }],
      frameRate: 20,
      repeat: -1
    })

    this.entity.anims.create({
      key: "death",
      frames: this.entity.anims.generateFrameNumbers(this.entity.type, {
        start: 8, end: 11
      }),
      duration: 2000
    })
  }

  public update = (dt: number) => {
    const { x, y } = this.position

    const vx = Phaser.Math.GetSpeed(this.entity.x - x, dt)
    const vy = Phaser.Math.GetSpeed(this.entity.y - y, dt)

    if (vx != 0) {
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
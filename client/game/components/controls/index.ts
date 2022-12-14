/* eslint-disable vue/sort-keys */

import Phaser from "phaser"

import Player from "~~/game/entities/player"
import GameUi from "~~/game/scenes/gameUi"

import KeyCodes = Phaser.Input.Keyboard.KeyCodes;
import { IComponent } from ".."

export default class Controls implements IComponent {
  private player!: Player
  private readonly controls: { [id: string]: Phaser.Input.Keyboard.Key } = {}

  constructor(scene: GameUi) {
    // add keys bindings here
    Object.entries(scene.input.keyboard.addKeys(
      {
        up: KeyCodes.UP,
        left: KeyCodes.LEFT,
        down: KeyCodes.DOWN,
        right: KeyCodes.RIGHT,
        w: KeyCodes.W,
        a: KeyCodes.A,
        s: KeyCodes.S,
        d: KeyCodes.D
      }, true, true
    )).forEach(([id, key]) => {
      this.controls[id] = key
    })

    scene.input.on("pointerdown", (event: Phaser.Input.Pointer) => this.player.fire(scene.giveRelativePositionToCanvas(new Phaser.Math.Vector2(event.x, event.y))))

    const crosshair = new Crosshair(scene)

    scene.input.on("pointermove", (event: Phaser.Input.Pointer) => crosshair.onMouseMove(event))
  }

  init(go: Phaser.GameObjects.GameObject) {
    this.player = go as Player
  }

  update(_dt: number) {
    const v = new Phaser.Math.Vector2(0, 0)
    const speed = this.player.getConfig().attributes.speed

    if (speed) {
      if (this.controls.right.isDown || this.controls.d.isDown) {
        v.x = speed
      } else if (this.controls.left.isDown || this.controls.a.isDown) {
        v.x = -speed
      }

      if (this.controls.up.isDown || this.controls.w.isDown) {
        v.y = -speed
      } else if (this.controls.down.isDown || this.controls.s.isDown) {
        v.y = speed
      }
    }

    this.player.setVelocity(v.x, v.y)
  }
}

class Crosshair extends Phaser.GameObjects.GameObject {
  private position!: Phaser.Types.Math.Vector2Like
  private arc!: Phaser.GameObjects.Arc

  constructor(scene: Phaser.Scene) {
    super(scene, "sprite")
    this.position = { x: -100, y: 100 }
    this.arc = this.scene.add.circle(this.position.x, this.position.y, 10)
  }

  public onMouseMove = (event: Phaser.Input.Pointer) => {
    this.arc.x = event.x
    this.arc.y = event.y
  }
}

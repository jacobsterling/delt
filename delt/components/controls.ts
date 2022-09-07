
import Phaser from "phaser";
import Player from "../entities/player";
import { IComponent } from "../services/componentService";
import { Crosshair } from "../hud/crosshair"
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;
import MainScene from "../scenes/mainScene";

export default class Controls implements IComponent {
  private player!: Player
  private readonly controls: { [id: string]: Phaser.Input.Keyboard.Key } = {}

  constructor(scene: Phaser.Scene) {
    //add keys bindings here
    Object.entries(scene.input.keyboard.addKeys(
      {
        "up": KeyCodes.UP,
        "left": KeyCodes.LEFT,
        "down": KeyCodes.DOWN,
        "right": KeyCodes.RIGHT,
        "w": KeyCodes.W,
        "a": KeyCodes.A,
        "s": KeyCodes.S,
        "d": KeyCodes.D,
      }, true, true
    )).forEach(([id, key]) => {
      this.controls[id] = key
    })

    scene.input.on('pointerdown', (event: Phaser.Input.Pointer) => this.player.fire(new Phaser.Math.Vector2(event.x, event.y)))
    const crosshair = new Crosshair(scene)
    scene.input.on('pointermove', (event: Phaser.Input.Pointer) => crosshair.onMouseMove(event))
  }

  init(go: Phaser.GameObjects.GameObject) {
    this.player = go as Player
  }

  update(dt: number) {
    const v = new Phaser.Math.Vector2(0, 0)
    const speed = this.player.speed

    if (speed) {
      if (this.controls.right.isDown || this.controls.d.isDown) {
        v.x = speed;
      }
      else if (this.controls.left.isDown || this.controls.a.isDown) {
        v.x = -speed;
      }

      if (this.controls.up.isDown || this.controls.w.isDown) {
        v.y = -speed;
      }
      else if (this.controls.down.isDown || this.controls.s.isDown) {
        v.y = speed;
      }
    }

    this.player.setVelocity(v.x, v.y);

    const scene = (this.player.scene as MainScene)

    if (scene.multiplayer) {
      scene.multiplayer.broadcastSelf(this.player)
    }
  }
}
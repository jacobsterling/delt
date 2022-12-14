
import { IComponent } from "."
import MainScene from "../scenes/baseScene"

export default class WorldBounds implements IComponent {
  private scene!: MainScene
  private object!: Phaser.GameObjects.GameObject

  constructor(scene: MainScene) {
    this.scene = scene
  }

  init(go: Phaser.GameObjects.GameObject) {
    this.object = go
  }

  update(dt: number) {
    const { x, y } = this.object.body.position

    if (!this.scene.physics.world.bounds.contains(x, y)) {
      this.object.emit("worldbounds")
    }
  }
}

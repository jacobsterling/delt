import { IComponent } from "."
import Entity from "../entities/entity"
import MainScene from "../scenes/baseScene"

export default class OnScreen implements IComponent {
  private scene: MainScene

  private entity!: Entity

  constructor(scene: MainScene) {
    this.scene = scene
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.entity = go as Entity
  }

  update(dt: number) {
    const screen = this.scene.cameras.main.worldView
    const br = this.entity.getBottomRight()
    const bl = this.entity.getBottomLeft()
    const tr = this.entity.getTopRight()
    const tl = this.entity.getTopLeft()

    if (!screen.contains(br.x as number, br.y as number) &&
      !screen.contains(bl.x as number, bl.y as number) &&
      !screen.contains(tr.x as number, tr.y as number) &&
      !screen.contains(tl.x as number, tl.y as number) &&
      this.entity.onScreen
    ) {
      this.entity.onScreen = false
      this.entity.emit("onScreen", this.entity.onScreen)
    } else if (!this.entity.onScreen) {
      this.entity.onScreen = true
      this.entity.emit("onScreen", this.entity.onScreen)
    }
  }
}

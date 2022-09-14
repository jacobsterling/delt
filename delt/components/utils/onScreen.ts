import { IComponent } from "../componentService"
import MainScene from "../../scenes/mainScene"
import Entity from "../../entities/entity"

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

    if (!screen.contains(br.x, br.y) &&
      !screen.contains(bl.x, bl.y) &&
      !screen.contains(tr.x, tr.y) &&
      !screen.contains(tl.x, tl.y) &&
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
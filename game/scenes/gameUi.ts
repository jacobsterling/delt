
import SettingsMenu from "game/components/ui/settingsMenu"
import ComponentService from "../components"
import MainScene from "./baseScene"
// import SettingsMenu from "./settingsMenu"

export default class GameUi extends Phaser.Scene {
  public mainscene!: MainScene
  public components!: ComponentService

  private settingsMenu!: SettingsMenu

  constructor() {
    super({ active: true, key: "GameUi" })
  }

  init() {
    this.components = new ComponentService()

    this.physics.world.setBounds(0, 0, 1920, 1080)
  }

  preload() { }

  create() {

    this.settingsMenu = new SettingsMenu(this)

    
  }

  public getRelativePositionToCanvas = (pos: Phaser.Math.Vector2) => {
    pos.x = (pos.x - this.mainscene.cameras.main.worldView.x) * this.mainscene.cameras.main.zoom
    pos.y = (pos.y - this.mainscene.cameras.main.worldView.y) * this.mainscene.cameras.main.zoom
    return pos
  }

  public giveRelativePositionToCanvas = (pos: Phaser.Math.Vector2) => {
    pos.x = pos.x / this.mainscene.cameras.main.zoom + this.mainscene.cameras.main.worldView.x
    pos.y = pos.y / this.mainscene.cameras.main.zoom + this.mainscene.cameras.main.worldView.y
    return pos
  }

  public update = (_t: number, dt: number) => {
    this.components.update(dt)
  }
}

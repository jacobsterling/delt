import Phaser from "phaser"
import ComponentService from "../components/componentService"
import MainScene from "./mainScene"
export default class GameUi extends Phaser.Scene {
  public mainscene!: MainScene
  public components!: ComponentService

  constructor() {
    super({ key: "GameUi", active: true })
  }

  init() {
    this.components = new ComponentService()

    this.physics.world.setBounds(0, 0, 1920, 1080);
  }

  preload() { }

  create() { }

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

  public update = (t: number, dt: number) => {
    this.components.update(dt)
  }
}
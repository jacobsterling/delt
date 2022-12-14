
import Entity from "~~/game/entities/entity"

import { IComponent } from ".."
import Player from "../../entities/player"
import BaseScene from "../../scenes/baseScene"
import GameUi from "../../scenes/gameUi"
import EntityUi from "./entityUi"

export default class MultiplayerUi implements IComponent {
  public player!: Player
  public scene: GameUi
  public playerCard !: Phaser.GameObjects.Container
  public playerHpBar!: Phaser.GameObjects.Rectangle
  public playerName !: Phaser.GameObjects.Text

  public tracker?: Phaser.Physics.Arcade.Sprite

  constructor(scene: GameUi) {
    this.scene = scene
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.player = go as Player

    const scene = (this.player.scene as BaseScene)

    // const index = Object.keys(mainScene.multiplayer.game!.players).length

    // const cardWidth = 100
    // const cardHeight = 50

    // this.playerHpBar = this.scene.add.rectangle(0, cardHeight, cardWidth, 10, 0x008000)

    // -cardWidth / 2, this.playerHpBar.y - 25

    // this.playerCard = this.scene.add.container(cardWidth / 2, index * cardHeight + 10, [this.playerHpBar, name])

    // this.playerCard.width = cardWidth

    // this.player.on("player.hp.changed", (mod: number) => {
    //   this.setPlayerHpBar(this.player.getStats().hp)
    // })

    const { x, y } = this.scene.getRelativePositionToCanvas(this.player.getBottomCenter())

    const name = this.player.getFeatures().display.name

    if (name) {
      this.playerName = this.scene.add.text(x, y, name, {
        color: "#ffffff",
        fontSize: "15px"
      })
    }

    const { x: tx, y: ty } = this.scene.getRelativePositionToCanvas(this.player.getTopCenter())

    if (this.player.isHostile(scene.player as Entity)) {
      this.tracker = this.scene.physics.add.sprite(tx, ty - 20, "flares", "green").setScale(0.4, 0.4).setVisible(!this.player.onScreen)

      this.tracker.setCollideWorldBounds()

      this.player.on("onScreen", (res: boolean) => {
        this.tracker!.setVisible(!res)
      })
    }
  }

  private setPlayerHpBar(value: number) {
    const percent = Phaser.Math.Clamp(value / this.player.getAttributes().max_hp, 0, 1)
    this.playerHpBar.width = this.playerCard.width * percent
  }

  update(_dt: number) {
    const { x, y } = this.scene.getRelativePositionToCanvas(this.player.getBottomCenter())

    this.playerName.setX(x - this.playerName.width / 2)
    this.playerName.setY(y)

    if (this.tracker) {
      const { x: tx, y: ty } = this.scene.getRelativePositionToCanvas(this.player.getTopCenter())

      this.scene.physics.moveTo(this.tracker, tx, ty - 20, 300)
    }
  }

  destroy() {
    this.playerCard.destroy()
  }
}

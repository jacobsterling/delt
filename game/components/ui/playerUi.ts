import { IComponent } from ".."
import Player from "../../entities/player"
import GameUi from "../../scenes/gameUi"

export default class PlayerUi implements IComponent {
  public player!: Player
  public scene: GameUi
  public playerHpBar !: Phaser.GameObjects.Arc
  public playerMpBar !: Phaser.GameObjects.Arc

  public playerHp !: Phaser.GameObjects.Text
  public playerMp !: Phaser.GameObjects.Text

  constructor(scene: GameUi) {
    this.scene = scene
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.player = go as Player

    const radius = 120
    this.scene.add.circle(radius, this.scene.sys.canvas.height - radius, radius, 0x181818)
    this.scene.add.circle(this.scene.sys.canvas.width - radius, this.scene.sys.canvas.height - radius, radius, 0x181818)
    this.playerHpBar = this.scene.add.arc(radius, this.scene.sys.canvas.height - radius, radius, -90, 270, false, 0xA70505)
    this.playerMpBar = this.scene.add.arc(this.scene.sys.canvas.width - radius, this.scene.sys.canvas.height - radius, radius, -90, 270, false, 0x131378)

    this.playerHp = this.scene.add.text(0, 0, [], {
      color: "#ffffff",
      fontSize: "20px"
    })

    Phaser.Display.Align.To.TopCenter(this.playerHp, this.playerHpBar)

    this.playerMp = this.scene.add.text(0, 0, [], {
      color: "#ffffff",
      fontSize: "20px"
    })

    Phaser.Display.Align.To.TopCenter(this.playerMp, this.playerMpBar)

    this.setPlayerHpBar(this.player.getAttributes().hp)
    this.setPlayerMpBar(this.player.getAttributes().mp)

    this.player.on("player.hp.changed", (mod: number) => {
      this.scene.tweens.addCounter({
        duration: 200,
        ease: Phaser.Math.Easing.Sine.InOut,
        from: this.player.getAttributes().hp + mod,
        onUpdate: (tween) => {
          const value = tween.getValue()
          this.setPlayerHpBar(value)
        },
        to: this.player.getAttributes().hp
      })
    })

    this.player.on("player.mp.changed", (mod: number) => {
      this.scene.tweens.addCounter({
        duration: 200,
        ease: Phaser.Math.Easing.Sine.InOut,
        from: this.player.getAttributes().mp + mod,
        onUpdate: (tween) => {
          const value = tween.getValue()
          this.setPlayerMpBar(value)
        },
        to: this.player.getAttributes().mp
      })
    })
  }

  private setPlayerHpBar(value: number) {
    this.playerHp.text = `HP: ${Phaser.Math.RoundTo(value, 0)}/${this.player.getAttributes().max_hp}`
    Phaser.Display.Align.To.TopCenter(this.playerHp, this.playerHpBar, 0, 10)
    const percent = Phaser.Math.Clamp(value / this.player.getAttributes().max_hp, 0, 1)
    this.playerHpBar.startAngle = Phaser.Math.Clamp(90 - (180 * percent), -90, 90)
    this.playerHpBar.endAngle = Phaser.Math.Clamp(90 + (180 * percent), 90, 270)
  }

  private setPlayerMpBar(value: number) {
    this.playerMp.text = `MP: ${Phaser.Math.RoundTo(value, 0)}/${this.player.getAttributes().max_mp}`
    Phaser.Display.Align.To.TopCenter(this.playerMp, this.playerMpBar, 0, 10)
    const percent = Phaser.Math.Clamp(value / this.player.getAttributes().max_mp, 0, 1)
    this.playerMpBar.startAngle = Phaser.Math.Clamp(90 - (180 * percent), -90, 90)
    this.playerMpBar.endAngle = Phaser.Math.Clamp(90 + (180 * percent), 90, 270)
  }
}

import Player from "../entities/player";
import GameUi from "../scenes/gameUi";
import { IComponent } from "./componentService";

export default class PlayerUi implements IComponent {
  public player!: Player
  public scene: GameUi
  public playerHpBar !: Phaser.GameObjects.Rectangle
  public playerHpBack !: Phaser.GameObjects.Rectangle

  constructor(scene: GameUi) {
    this.scene = scene
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.player = go as Player

    if (this.scene.player == this.player) {

      this.playerHpBack = this.scene.add.rectangle(10, 10, 300, 70, 0x000000, 1)
      this.playerHpBar = this.scene.add.rectangle(10, 10, 300, 70, 0xff0000)

    } else {
      // other players
    }

    this.player.on("player.damaged", (mod: number) => {
      const percent = Phaser.Math.Clamp(this.player.getHp() / this.player.maxHp, 0, 1);

      this.scene.tweens.create({
        targets: this.playerHpBar,
        displayWidth: this.playerHpBack.width * percent,
        duration: 1000,
        ease: Phaser.Math.Easing.Sine.Out,
      })
    }
    )
  }

  update() {

  };

  destroy() { }
}
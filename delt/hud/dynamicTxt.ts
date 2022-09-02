import MainScene from "../scenes/mainScene";
import { IComponent } from "../services/componentService";

export type DynamicTxtConfig = {
  x: number,
  y: number,
  txt: string,
  movement?: {
    velocity: Phaser.Math.Vector2,
    acceleration?: Phaser.Math.Vector2
  }
  lifetime?: number
  style: Phaser.Types.GameObjects.Text.TextStyle,
}

class MoveTxt implements IComponent {
  public body!: DynamicTxt
  public text!: Phaser.GameObjects.Text

  constructor(txt: Phaser.GameObjects.Text) {
    this.text = txt
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.body = go as DynamicTxt
    this.text.setVisible(true)
  };

  update(dt: number) {
    if (this.body) {
      this.text.setX(this.body.x)
      this.text.setY(this.body.y)
    }

  };
}

export default class DynamicTxt extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: MainScene, config: DynamicTxtConfig) {
    super(scene, config.x, config.y, "sprite")

    this.setVisible(false)
    scene.physics.add.existing(this).setCollideWorldBounds(true)

    const txt = scene.add.text(config.x, config.y, config.txt, config.style).setVisible(false);
    scene.components.addComponent(this, new MoveTxt(txt))

    if (config.lifetime) {
      const tint = txt.tint

      this.scene.time.addEvent({
        delay: config.lifetime, callback: () => {
          this.destroy()
        },
      });
      this.scene.time.addEvent({
        delay: config.lifetime, repeat: 10, callback: () => {
          txt.tint = txt.tint - tint / 10//doesnt rly work, want to decrease opacity
        },
      });
    }

    if (config.movement) {
      const { x, y } = config.movement.velocity
      this.setVelocity(x, y)
      if (config.movement.acceleration) {
        const { x: ax, y: ay } = config.movement.acceleration
        this.setAcceleration(ax, ay)
      }
    }

    this.on("destroy", () => {
      scene.components.removeComponent(this, MoveTxt)
      this.body.destroy()
      txt.destroy()
    })
  }
}
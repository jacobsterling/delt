
import Entity from "../../entities/entity";
import GameUi from "../../scenes/gameUi";
import { getRandom } from "../../scenes/mainScene";
import { IComponent } from "../componentService";
import DynamicTxt, { DynamicTxtConfig } from "../utils/dynamicTxt";

export default class EntityUi implements IComponent {
  public entity!: Entity
  public scene: GameUi
  public entityHpBar !: Phaser.GameObjects.Rectangle
  public lifetime !: Phaser.Time.TimerEvent

  constructor(scene: GameUi) {
    this.scene = scene
  }

  init(go: Phaser.Physics.Arcade.Sprite) {
    this.entity = go as Entity

    const { x, y } = this.scene.getRelativePositionToCanvas(this.entity.getBottomCenter())

    this.entityHpBar = this.scene.add.rectangle(x, y + 20, this.entity.width, 5, 0x008000).setVisible(false)

    this.entity.on("entity.hp.changed", (mod: number) => {
      if (mod != this.entity.getStats().hp_regen) {
        this.damageNumbers(mod)
      }
      this.setEntityHpBar(this.entity.getStats().hp)
    })
  }

  private setEntityHpBar(value: number) {
    this.entityHpBar.setVisible(true)
    const percent = Phaser.Math.Clamp(value / this.entity.getMaxHp(), 0, 1);
    this.entityHpBar.width = this.entity.width * percent
    if (this.lifetime) {
      this.lifetime.destroy()
    }
    this.lifetime = this.scene.time.addEvent({
      delay: 2000,
      callback: () => {
        this.entityHpBar.setVisible(false)
      }
    })
  }

  private damageNumbers(mod: number) {
    const { x, y } = this.entity.getTopCenter()

    var ax = getRandom(10, 70)
    const ay = getRandom(20, 50)

    var vx = getRandom(0, 50)
    const vy = getRandom(-10, -70)

    var color = "#FF0000"

    //heals
    if (mod > 0) {
      ax = -ax
      vx = -vx
      color = "#00FF00"
    }

    const config: DynamicTxtConfig = {
      x,
      y,
      txt: mod.toString(),
      lifetime: 1000,
      movement: {
        velocity: new Phaser.Math.Vector2(vx, vy),
        acceleration: new Phaser.Math.Vector2(ax, ay)
      },
      style: {
        color,
        fontSize: "17px"
      }
    }

    new DynamicTxt(this.scene.mainscene, config)
  }

  update(dt: number) {
    const { x, y } = this.scene.getRelativePositionToCanvas(this.entity.getBottomCenter())
    this.entityHpBar.setX(x)
    this.entityHpBar.setY(y + 20)
  };
}
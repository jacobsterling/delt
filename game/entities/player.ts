/* eslint-disable indent */

import { EntityFeatures, DefaultAttributes, ModableAttributes } from "."
import Controls from "../components/controls"
import Movement from "../components/controls/movement"
import MultiplayerUi from "../components/ui/multiplayerUi"
import PlayerUi from "../components/ui/playerUi"
import BaseScene from "../scenes/baseScene"
import Entity from "./entity"
import { Bolt, BoltConfig } from "./projectiles/bolt"

export interface PlayerConfig extends EntityFeatures {

}

export interface PlayerAttributes extends DefaultAttributes {
  hp_regen: number,
  mp_regen: number,
  attack_speed: number
}

export default class Player extends Entity {
  protected attackTimer?: Phaser.Time.TimerEvent

  protected regenTimer?: Phaser.Time.TimerEvent

  constructor(scene: BaseScene, config: PlayerConfig) {
    super(scene, config as EntityFeatures)

    this.getConfig = (): PlayerConfig => {
      return super.getFeatures()
    }

    this.updateConfig = (config: PlayerConfig, dt: number) => {
      this.updateFeatures(config, dt)

      if (!this.regenTimer && this.modable()) {
        this.regenTimer = this.scene.time.addEvent({
          callback: () => {
            this.mod("hp", this.data.values.hp_regen)
            this.mod("mp", this.data.values.mp_regen)
          },
          delay: 1000,
          loop: true
        })
      } else if (!this.modable()) {
        this.regenTimer = undefined
      }
    }

    this.mod = (attribute: keyof typeof ModableAttributes, mod: number, duration?: number) => {
      const { prev, scene } = this.baseMod(attribute, mod, duration)

      switch (attribute) {
        case "hp_regen":
          this.data.values.hp_regen += mod

          if (duration) {
            this.scene.time.addEvent({
              callback: () => {
                this.data.values.hp_regen -= mod
              },
              delay: duration
            })
          }
          break

        case "mp_regen":
          this.data.values.mp_regen += mod

          if (duration) {
            this.scene.time.addEvent({
              callback: () => {
                this.data.values.mp_regen -= mod
              },
              delay: duration
            })
          }
          break

        case "attack_speed":
          this.data.values.attack_speed += mod

          if (duration) {
            this.scene.time.addEvent({
              callback: () => {
                this.data.values.attack_speed -= mod
              },
              delay: duration
            })
          }
          break

        default:
          break
      }

      return { prev, scene }
    }

    this.spawn = (name: string) => {
      this.baseSpawn(name)

      scene.components.addComponent(this, new Movement())

      if (this.modable()) {
        this.toggleControl()
      } else {
        scene.ui.components.addComponent(this, new MultiplayerUi(scene.ui))
      }

      return this
    }
  }

  public toggleControl(toggle = true) {
    const scene = this.scene as BaseScene
    if (toggle) {
      scene.ui.components.addComponent(this, new Controls(scene.ui))
      scene.ui.components.addComponent(this, new PlayerUi(scene.ui))
      scene.cameras.main.startFollow(this)
      scene.player = this
    } else {
      scene.ui.components.destroyComponent(this, PlayerUi)
      scene.ui.components.destroyComponent(this, Controls)
    }
  }

  public modAttackSpeed(mod: number, duration?: number) {
    this.data.values.attack_speed += mod
    if (duration) {
      this.scene.time.addEvent({
        callback: () => {
          this.data.values.attack_speed -= mod
        },
        delay: duration
      })
    }
  }

  public resetAttackTimer() {
    if (this.attackTimer) {
      this.attackTimer.destroy()
    }
    this.attackTimer = this.scene.time.addEvent({
      delay: 1000 / this.data.values.attack_speed
    })
  }

  public fire = (direction: Phaser.Math.Vector2) => {
    if ((!this.attackTimer || this.attackTimer.getProgress() === 1) && this.getFeatures().attributes.mp >= 5) {
      const scene = this.scene as BaseScene

      // eslint-disable-next-line no-new
      new Bolt(scene, {
        affects: ["magic damage"],
        attributes: {
          hp: 0,
          max_hp: 0,
          max_mp: 0,
          mp: 0,
          speed: 50
        },
        direction,
        display: {
          height: 10,
          texture: "flares",
          width: 10
        },
        manager: this.manager,
        position: new Phaser.Math.Vector2(this.x, this.y),
        spawner: this.name,
        type: "bolt"
      })

      this.resetAttackTimer()
      this.mod("mp", -5)
    }
  }
}

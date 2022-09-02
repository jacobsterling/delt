
import Entity, { EntityConfig } from './entity';
import Controls from '../components/controls';
import MainScene from '../scenes/mainScene';
import { Bolt } from "./projectiles/bolt"
import { AffectorConfig } from './affector';

export interface PlayerConfig extends EntityConfig {
  control: boolean;
}

export default class Player extends Entity {
  constructor(scene: MainScene, config: PlayerConfig) {
    super(scene, config)
    if (config.control) {
      scene.components.addComponent(this, new Controls(scene))

      this.on("destroy", () => {
        (this.scene as MainScene).components.removeComponent(this, Controls)
      })

      if (scene.multiplayer) {
        scene.multiplayer.broadcast = true

        if (scene.multiplayer.self_id == this.name) {
          this.on("player.destroy", () => {

            this.destroy()
            scene.entityPhysics.kill(this)
          })
        }
      }
    };
  }

  public fire = (direction: Phaser.Math.Vector2) => {
    if (!this.attackTimer || this.attackTimer.getProgress() == 1) {
      const scene = this.scene as MainScene

      const config: AffectorConfig = {
        x: this.x,
        y: this.y,
        width: 10,
        height: 10,
        speed: 10,
        direction,
        texture: "flares",
        type: "bolt",
        affects: ["magic damage"],
        spawner: this
      }//id of projectile given by server

      new Bolt(scene, config)

      this.resetAttackTimer()
    }
  }
}

import Entity, { EntityConfig } from './entity';
import MainScene from "../scenes/mainScene";
import { Bolt } from "./projectiles/bolt"
import { AffectorConfig } from './affector';

export interface PlayerConfig extends EntityConfig {
  //player stats etc
}

export default class Player extends Entity {
  constructor(scene: MainScene, config: PlayerConfig) {
    super(scene, config)
    if (scene.multiplayer.self_id == this.name) {
      scene.multiplayer.broadcast = true
      this.scene.scene.run("GameUi", { player: this })
    } else {
      this.setImmovable()
    }
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
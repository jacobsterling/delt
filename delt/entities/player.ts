
import Entity, { EntityConfig } from './entity';
import MultiplayerUi from "../components/ui/multiplayerUi"
import MainScene from "../scenes/mainScene";
import { Bolt } from "./projectiles/bolt"
import { AffectorConfig } from './affector';
import Controls from "../components/controls/playerControls"
import PlayerUi from "../components/ui/playerUi"
export interface PlayerConfig extends EntityConfig {
  //player stats etc
}
export default class Player extends Entity {
  constructor(scene: MainScene, config: PlayerConfig) {
    super(scene, config)
    if (scene.multiplayer.self_id == this.name) {
      scene.multiplayer.broadcast = true
      scene.ui.components.addComponent(this, new Controls(scene.ui))
      scene.ui.components.addComponent(this, new PlayerUi(scene.ui))
      this.friendly = true
      scene.cameras.main.startFollow(this)
    } else {
      this.setImmovable()
      scene.ui.components.addComponent(this, new MultiplayerUi(scene.ui))
    }
  }

  public fire = (direction: Phaser.Math.Vector2) => {
    if (!this.attackTimer || this.attackTimer.getProgress() == 1 && this.getStats().mp >= 5) {
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
        spawner: this,
        exclude: [this.name]
      }//id of projectile given by server

      new Bolt(scene, config)

      this.resetAttackTimer()

      this.modMp(-5)
    }
  }
}
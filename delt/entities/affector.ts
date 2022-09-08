
import short from "short-uuid";
import Entity from "./entity"
import Mainscene, { radToDeg } from "../scenes/mainScene"
import affects, { Affects } from "./affects"

export type AffectorConfig = {
  x: number,//origin
  y: number,
  direction?: Phaser.Math.Vector2
  speed?: number
  texture: string | Phaser.Textures.Texture
  width: number,
  height: number,
  type: string,
  id?: string,
  spawner?: Phaser.Physics.Arcade.Sprite
  affects: string[] //affect id's
}

export default class Affector extends Phaser.Physics.Arcade.Sprite {
  public affects: Affects = {};//stored like this so 'effects' can be modified
  private spawner!: Phaser.Physics.Arcade.Sprite | Phaser.Scene//if null, spawned by scene

  constructor(scene: Mainscene, config: AffectorConfig) {
    super(scene, config.x, config.y, config.texture, 0)
    this.type = config.type

    if (config.spawner) {
      this.spawner = config.spawner
      spawner_id = config.spawner.name
    } else {
      var spawner_id = "scene"
    }

    if (scene.multiplayer && !config.id) {
      scene.multiplayer.broadcastMessage("spawn",
        {
          spawn: config,
          spawner: spawner_id
        }
      )
    } else if (!scene.multiplayer && !config.id) {
      config.id = short.generate()
    }

    if (config.id) {
      this.setName(config.id)

      this.setVisible(false)

      scene.affectors.add(this)

      //this.setDisplaySize(100, 100)

      this.setBodySize(config.width, config.height)

      scene.add.existing(this)

      Array(config.affects).forEach(([id]) => {
        this.addAffect(id)
      })

      if (config.direction && config.speed) {
        this.setCollideWorldBounds(true)

        const atan = Math.atan2(this.y - config.direction.y, this.x - config.direction.x);

        const d = {
          x: -radToDeg(Math.cos(atan)),
          y: -radToDeg(Math.sin(atan))
        };

        this.setVelocity(d.x * config.speed, d.y * config.speed);
      }

      this.on("destroy", () => {
        //this.body.destroy()
        scene.affectors.kill(this)

        if (scene.multiplayer) {
          scene.multiplayer.broadcastMessage("despawn", { "spawn_id": this.name })
        }
      }
      )
    }
  }

  public removeAffect(id: string) {
    delete this.affects[id]
  }

  public addAffect(id: string) {
    this.affects[id] = affects[id]
  }

  //applies all effects of affect
  public affect(entity: Entity) {
    const scene = (this.scene as Mainscene)

    if (!scene.multiplayer.game || entity.name == scene.multiplayer.self_id || (!scene.multiplayer.game.players[entity.name] && scene.multiplayer.isHost())) {
      Object.entries(this.affects).forEach(([id, affect]) => {
        affect.affect(entity, this)
      })
    } else if (scene.multiplayer) {
      scene.multiplayer.broadcastMessage("affect", { "affector_id": this.name, "affected_id": entity.name })
    }
  }
}
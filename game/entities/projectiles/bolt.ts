import Phaser from "phaser"

import { EntityFeatures, EntityConfigs } from ".."
import WorldBounds from "../../components/worldBounds"
import BaseScene from "../../scenes/baseScene"
import MainScene from "../../scenes/baseScene"
import Entity from "../entity"
import Player from "../player"

export interface BoltConfig extends EntityFeatures {
  affects: string[]
  direction: Phaser.Math.Vector2
  spawner: string
}

export class Bolt extends Entity {
  public emitter!: Phaser.GameObjects.Particles.ParticleEmitter

  protected affects: string[] = ["magic damage"]

  protected direction: Phaser.Math.Vector2

  protected spawner: Player

  public onContact = (entity: Entity) => {
    if (entity.name !== this.spawner.name) {
      this.affect(this.affects, [entity])
    }
  }

  public updateConfig = (config: EntityConfigs, _dt: number) => {
    const thisConfig = config as BoltConfig

    const ds = this.getAttributes().speed - config.attributes.speed

    if (ds !== 0) {
      this.mod("speed", ds)
    }

    if (thisConfig.direction !== this.direction) {
      this.moveInDirection(thisConfig.direction)
      this.direction = thisConfig.direction
    }
  }

  public getConfig: () => BoltConfig = () => {
    return {
      ...this.getFeatures(),
      affects: this.affects,
      direction: this.direction,
      spawner: this.spawner.name
    }
  }

  public spawn: (name: string) => Entity = (name: string) => {
    console.log("spawn: ", this.direction)

    this.baseSpawn(name)

    const scene = this.scene as BaseScene

    const particles = scene.add.particles(this.display.texture)

    this.emitter = particles.createEmitter({
      blendMode: "ADD",
      emitZone: { source: new Phaser.Geom.Circle(0, 0, 1) as Phaser.Types.GameObjects.Particles.RandomZoneSource, type: "random" },
      follow: this,
      frame: "red",
      frequency: 0.2,
      lifespan: 300,
      quantity: 1,
      radial: true,
      scale: { ease: "Power3", end: 0, start: 0.3 },
      scaleX: 0.3,
      scaleY: 0.3,
      x: this.x,
      y: this.y
    })

    this.on("outside", () => {
      this.destroy()
    })

    scene.components.addComponent(this, new WorldBounds(scene))

    this.on("destroy", () => {
      this.emitter.remove()
      particles.destroy(true)
    })

    this.moveInDirection(this.direction)

    return this
  }

  constructor(scene: MainScene, config: BoltConfig) {
    super(scene, config)

    this.direction = config.direction

    this.spawner = scene.children.getByName(config.spawner) as Player
  }
}

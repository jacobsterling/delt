import Phaser from "phaser"
import MainScene from "../../scenes/mainScene"
import Affector, { AffectorConfig } from "../affector";

export class Bolt extends Affector {
  public emitter!: Phaser.GameObjects.Particles.ParticleEmitter

  constructor(scene: MainScene, config: AffectorConfig) {
    super(scene, config)

    if (this.name) {
      const particles = scene.add.particles(config.texture);

      const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
        frame: 'red',
        radial: true,
        lifespan: 300,
        quantity: 1,
        frequency: 0.2,
        follow: this,
        scaleX: 0.3,
        scaleY: 0.3,
        x: config.x,
        y: config.y,
        scale: { start: 0.3, end: 0, ease: 'Power3' },
        blendMode: 'ADD',
        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 1) as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      };

      this.emitter = particles.createEmitter(emitterConfig);

      this.on("destroy", () => {
        this.emitter.remove()
        particles.destroy(true)
      })
    }
  }
}

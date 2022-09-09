import ComponentService from '../components/componentService';
import Entity, { EntityConfig } from '../entities/entity';
import Affector, { AffectorConfig } from "../entities/affector"
import { Multiplayer } from "../../client/plugins/game.client"
import { Bolt } from '../entities/projectiles/bolt';
import Player from '../entities/player';

export const radToDeg = (rad: number) => rad * (180 / Math.PI)

export const getRandom = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}
export default class MainScene extends Phaser.Scene {
    public components!: ComponentService
    public multiplayer!: Multiplayer;
    public entityPhysics!: Phaser.Physics.Arcade.Group;
    public affectors!: Phaser.Physics.Arcade.Group;

    constructor() {
        super({
            key: 'MainScene',
        })
    }

    init(data: any) {
        this.multiplayer = data.multiplayer as Multiplayer;

        this.components = new ComponentService()

        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.physics.world.setBoundsCollision();

        this.physics.world.bounds.contains

        this.entityPhysics = this.physics.add.group()
        this.affectors = this.physics.add.group()

        this.physics.add.collider(this.entityPhysics, this.affectors, (entity, effector) => {
            (effector as Affector).affect(entity as Entity)
        })

        //this doesnt work ?

    }

    create = () => {
        this.multiplayer.events.on("game.spawn", (features: AffectorConfig, spawner_id: string) => {
            const spawner = this.children.getByName(spawner_id)

            if (spawner) {
                features.spawner = spawner as Phaser.Physics.Arcade.Sprite
            }

            switch (features.type) {
                case "bolt":
                    new Bolt(this, features)
                    break

                default:
                    new Affector(this, features)
                    break
            }
        })

        this.multiplayer.events.on("game.despawn", (spawn_id: string) => {
            const spawn = this.children.getByName(spawn_id)
            if (spawn) {
                spawn.destroy()
            }
        })

        this.multiplayer.events.on("game.affect", (affected_id: string, affector_id: string) => {
            const affected = (this.children.getByName(affected_id) as Entity)

            const affector = (this.children.getByName(affector_id) as Affector)

            if (affector) {
                try {
                    affector?.affect(affected)
                } catch (error: unknown) {
                    const err = error as Error
                    switch (err.message) {
                        case "affector.affect is not a function":
                            break

                        default:
                            console.error(err)
                            break
                    }
                }
            }
        })

        this.multiplayer.events.on("entity.update", (id: string, features: EntityConfig) => {
            const entity = this.children.getByName(id) as Entity
            if (!entity) {
                new Entity(this, features)
            } else {
                entity.setFeatures(features)
            }
        })

        this.multiplayer.events.on("player.update", (id: string, features: EntityConfig) => {
            const player = this.children.getByName(id) as Player
            if (player) {
                if (id !== this.multiplayer.self_id) {
                    player.setFeatures(features)
                }
            } else {
                if (features.name && this.multiplayer.game) {
                    this.multiplayer.game.players[features.name] = new Player(this, features)
                }
            }
        })

        this.events.on("entity.destroy", (entity: Entity) => {
            if (this.multiplayer.game) {
                if (this.multiplayer.game.players[entity.name]) {
                    this.events.emit("player.destroy", entity)
                } else if (this.multiplayer.isHost()) {
                    entity.destroy()
                    this.entityPhysics.kill(entity)
                }
            }
        })

        this.events.on("player.destroy", (player: Player) => {
            if (!this.multiplayer.game || player.name == this.multiplayer.self_id) {
                player.destroy()
                this.entityPhysics.kill(player)
                this.multiplayer.leaveGame()
            }
        })
    }

    public update = (t: number, dt: number) => {
        this.components.update(dt)
    }
}



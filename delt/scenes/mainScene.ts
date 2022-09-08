import ComponentService from '../services/componentService';
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

        this.entityPhysics = this.physics.add.group()
        this.affectors = this.physics.add.group()

        this.physics.add.collider(this.entityPhysics, this.affectors, (entity, effector) => {
            (effector as Affector).affect(entity as Entity)
        })

        //this doesnt work ?
        this.entityPhysics.world.on('worldbounds', (body: any) => {
            console.log(body)
        })
    }

    create = () => {

        if (this.multiplayer) {
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

            this.multiplayer.events.on("game.update.entity", (id: string, features: EntityConfig) => {
                const entity = this.children.getByName(id) as Entity
                if (!entity) {
                    new Entity(this, features)
                } else {
                    // predictive movement ???
                    const dhp = features.hp - entity.getHp()
                    const ds = features.speed - entity.getHp()
                    if (dhp !== 0) {
                        entity.modHp(dhp)
                    }
                    if (ds !== 0) {
                        entity.modSpeed(ds)
                    }
                    // do the same for setPosition as above ??
                    entity.setPosition(features.x, features.y)
                }
            })

            this.multiplayer.events.on("game.update.player", (id: string, features: EntityConfig) => {
                const object = this.children.getByName(id) as Player

                if (this.multiplayer) {
                    if (object && id !== this.multiplayer.self_id) {
                        const dhp = features.hp - object.getHp()
                        const ds = features.speed - object.getHp()

                        if (dhp !== 0) {
                            object.modHp(dhp)
                        }
                        if (ds !== 0) {
                            object.modSpeed(ds)
                        }

                        // do the same for setPosition as above ??
                        object.setPosition(features.x, features.y)
                    } else if (!object) {
                        if (features.name && this.multiplayer.game) {
                            if (features.name !== this.multiplayer.self_id) {
                                // creates other player
                                this.multiplayer.game.players[features.name] = new Player(this, {
                                    control: false,
                                    ...features
                                }).setImmovable()
                            } else {
                                // creates self
                                this.multiplayer.game.players[features.name] = new Player(this, {
                                    control: true,
                                    ...features
                                })
                            }
                        }
                    }
                }
            })
            console.log("created")
        }
    }

    public update = (t: number, dt: number) => {
        this.components.update(dt)
    }
}



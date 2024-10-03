/* eslint-disable camelcase */
/* eslint-disable indent */
import "phaser"
import { v4 } from "uuid"

import { Attributes, DisplayConfigs, EntityConfigs, EntityFeatures, EntityTypes, ModableAttributes } from "."
import Movement from "../components/controls/movement"
import OnScreen from "../components/OnScreen"
import BaseScene, { radToDeg } from "../scenes/baseScene"
import { affects } from "./affects"

const nameof = <T>(name: Extract<keyof T, string>): string => name

export default class Entity extends Phaser.Physics.Arcade.Sprite {
    protected display: DisplayConfigs

    readonly startPosition: Phaser.Math.Vector2

    public onScreen = false

    protected manager: string

    // eslint-disable-next-line no-use-before-define
    public allies: Entity[] = []

    public isHostile(check: Entity): boolean {
        return !this.allies.includes(check)
    }

    // eslint-disable-next-line no-use-before-define
    public onContact?: (entity: Entity) => void

    public getAttributes = () => {
        return this.data.getAll() as Attributes
    }

    public getFeatures(): EntityFeatures {
        return {
            attributes: this.getAttributes(),
            display: this.display,
            manager: this.manager,
            position: new Phaser.Math.Vector2(this.x, this.y),
            type: this.type as keyof typeof EntityTypes
        }
    }

    protected updateFeatures = (features: EntityFeatures, dt: number) => {
        const attributes = this.getAttributes()

        if (this.manager !== features.manager) {
            this.setPushable(false)
            this.manager = features.manager
        }

        const dhp = features.attributes.hp - attributes.hp
        const dmp = features.attributes.mp - attributes.mp
        const ds = features.attributes.speed - attributes.speed

        if (dhp !== 0) {
            this.mod("hp", dhp)
        }
        if (dmp !== 0) {
            this.mod("mp", dmp)
        }
        if (ds !== 0) {
            this.mod("speed", dhp)
        }
        this.moveTo(features.position, dt)
    }

    public modable = () => (this.scene as BaseScene).ws.username === this.manager || !(this.scene as BaseScene).ws.session

    public mod!: (attribute: keyof typeof ModableAttributes, mod: number, duration?: number) => void

    // replace 3 functions below when introducing subclass with more modable attrbutes
    public baseMod = (attribute: keyof typeof ModableAttributes, mod: number, duration?: number) => {
        const prev = this.data.get(attribute)
        const scene = (this.scene as BaseScene)
        switch (attribute) {
            case "hp":
                this.data.values.hp = Phaser.Math.Clamp(prev + mod, 0, this.data.values.max_hp)

                if (this.data.values.hp !== prev) {
                    this.emit(`${this.type}.hp.changed`, mod)
                }

                if (this.data.values.hp <= 0) {
                    scene.components.destroyComponent(this, Movement)

                    this?.anims.play("death", true).once("animationcomplete", () => {
                        this.scene.events.emit("entity.destroy", this)
                    })
                } else if (duration) {
                    this.scene.time.addEvent({
                        callback: () => {
                            this.data.values.hp -= mod
                        },
                        delay: duration
                    })
                }
                break

            case "max_hp":
                this.data.values.max_hp += mod
                if (duration) {
                    this.scene.time.addEvent({
                        callback: () => {
                            this.data.values.max_hp -= mod
                        },
                        delay: duration
                    })
                }
                break

            case "mp":
                this.data.values.mp = Phaser.Math.Clamp(this.data.values.mp + mod, 0, this.data.values.max_mp)

                if (this.data.values.mp !== prev) {
                    this.emit(`${this.type}.mp.changed`, mod)
                }

                if (duration) {
                    this.scene.time.addEvent({
                        callback: () => {
                            this.data.values.mp -= mod
                        },
                        delay: duration
                    })
                }
                break

            case "max_mp":
                this.data.values.max_mp += mod
                if (duration) {
                    this.scene.time.addEvent({
                        callback: () => {
                            this.data.values.max_mp -= mod
                        },
                        delay: duration
                    })
                }
                break

            case "speed":
                this.data.values.speed += mod
                if (duration) {
                    this.scene.time.addEvent({
                        callback: () => {
                            this.data.values.speed -= mod
                        },
                        delay: duration
                    })
                }
                break

            default:
                break
        }

        return { prev, scene } // return references to sub verison of this function
    }

    // sould call getFeatures from this class
    public getConfig: () => EntityConfigs = () => this.getFeatures()

    // sould call updateFeatures
    public updateConfig!: (config: EntityConfigs, dt: number) => void

    constructor(scene: BaseScene, features: EntityFeatures) {
        const { x: px, y: py } = features.position

        super(scene, px, py, features.display.texture, 0)

        this.manager = features.manager

        this.setDataEnabled()

        for (const [key, value] of Object.entries(features.attributes)) {
            this.setData(key, value)
        }

        this.type = features.type

        this.startPosition = new Phaser.Math.Vector2(px, py)

        this.display = features.display

        this.setName(v4())

        if (scene.ws.session) {
            scene.ws.session.update.spawns[this.name] = this.getConfig()

            console.log("new: ", scene.ws.session.update.spawns)
        } else {
            this.spawn(this.name)
        }

        this.setVisible(false)

        scene.add.existing(this)
    }

    // eslint-disable-next-line no-use-before-define
    public spawn!: (name: string) => Entity

    // can be replaced by sub classes
    public baseSpawn(name: string) {
        console.log("spawning: ", name)

        const scene = this.scene as BaseScene

        scene.entityPhysics.add(this)

        this.setScale(3, 3).setCollideWorldBounds(true)

        this.body.setSize(this.display.width, this.display.height) // 0.4 * this.body.width, 0.8 * this.body.height

        const { x, y } = this.body.offset

        this.body.setOffset(x, y + 3)

        this.on("outside", () => {
            this.onScreen = false
        })

        this.on("inside", () => {
            this.onScreen = true
        })

        scene.ui.components.addComponent(this, new OnScreen(scene))

        this.on("destroy", () => {
            this.body.destroy()
            scene.entityPhysics.kill(this)
        })

        this.emit(`${this.type}.spawned`, this.name, name)

        this.setName(name)

        this.setVisible(true)
    }

    public affect(affect_ids: (keyof typeof affects)[], entities: Entity[]) {
        const scene = this.scene as BaseScene

        if (this.modable()) {
            const affected: string[] = []

            for (const entity of entities) {
                if (entity.modable()) {
                    for (const id of affect_ids) {
                        affects[id]?.affect(entity, this)
                    }
                } else {
                    affected.push(entity.name)
                }
            }

            if (affected.length > 0) {
                scene.ws.sendUpdate({ update: { affected, affector: this.name, affectors: affect_ids }, update_type: "affect" })
            }
        }
    }

    public moveInDirection({ x, y }: Phaser.Math.Vector2) {
        const { dx, dy } = { dx: x - this.x, dy: y - this.y }

        if (dx !== 0 || dy !== 0) {
            const atan = Math.atan2(this.y - y, this.x - x)

            const d = {
                x: -radToDeg(Math.cos(atan)),
                y: -radToDeg(Math.sin(atan))
            }

            this.setVelocity(d.x * this.data.values.speed, d.y * this.data.values.speed)
        }
    }

    public moveTo({ x, y }: Phaser.Math.Vector2, dt?: number) {
        this.scene.physics.moveTo(this, x, y, this.data.values.speed, dt)
    }
}

import 'phaser';
import MainScene from '../scenes/mainScene';
import Movement from "../components/controls/movement"
import short from "short-uuid"
import EntityUi from '../components/ui/entityUi';
import OnScreen from '../components/utils/OnScreen';

const nameof = <T>(name: Extract<keyof T, string>): string => name;
export interface ITextureList {
    [key: string]: string
}

export type EntityStats = {
    hp: number,
    hp_regen: number,
    mp_regen: number,
    mp: number,
    speed: number,
    attackSpeed: number //attacks per second
}

export type EntityConfig = {
    displayName: string,
    name?: string,//also id
    type: string,
    x: number,
    y: number,
    stats: EntityStats
}
export default class Entity extends Phaser.Physics.Arcade.Sprite {
    readonly displayName!: string

    protected stats: EntityStats

    protected friendly: boolean = false

    readonly startPosition: Phaser.Math.Vector2
    protected maxHp: number
    protected maxMp: number

    protected regenTimer?: Phaser.Time.TimerEvent

    protected attackTimer?: Phaser.Time.TimerEvent

    protected modable: boolean = true

    public onScreen: boolean = false

    constructor(scene: MainScene, config: EntityConfig) {
        super(scene, config.x, config.y, config.type, 0)

        this.type = config.type;
        this.stats = config.stats

        this.startPosition = new Phaser.Math.Vector2(config.x, config.y)

        this.displayName = config.displayName

        this.maxHp = config.stats.hp
        this.maxMp = config.stats.mp

        if (!config.name) {
            this.setName(short.generate())
        } else {
            this.setName(config.name)
        }

        scene.components.addComponent(this, new Movement())

        scene.entityPhysics.add(this)
        scene.add.existing(this).setScale(3, 3).setCollideWorldBounds(true)

        this.body.setSize(0.4 * this.body.width, 0.8 * this.body.height)

        const { x, y } = this.body.offset

        this.body.setOffset(x, y + 3)

        if (scene.multiplayer.isModable(this.name)) {
            this.regenTimer = this.scene.time.addEvent({
                delay: 1000,
                loop: true,
                callback: () => {
                    this.modHp(this.stats.hp_regen)
                    this.modMp(this.stats.mp_regen)
                }
            });
        }

        this.on("outside", () => {
            this.onScreen = false
        })

        this.on("inside", () => {
            this.onScreen = true
        })

        scene.ui.components.addComponent(this, new OnScreen(scene))
        scene.ui.components.addComponent(this, new EntityUi(scene.ui))
    }

    public isFriendly() {
        return this.friendly
    }

    public resetAttackTimer() {
        if (this.attackTimer) {
            this.attackTimer.destroy()
        }
        this.attackTimer = this.scene.time.addEvent({
            delay: 1000 / this.stats.attackSpeed,
        });
    }

    public getStats() {
        return this.stats
    }

    public getMaxHp() {
        return this.maxHp
    }

    public getMaxMp() {
        return this.maxMp
    }

    //to add special effects
    public modAttackSpeed(mod: number, duration?: number) {
        this.stats.attackSpeed += mod
        if (duration) {
            this.scene.time.addEvent({
                delay: duration, callback: () => {
                    this.stats.attackSpeed -= mod
                },
            });
        }
    }

    //to add special effects
    public modSpeed(mod: number, duration?: number) {
        this.stats.speed += mod
        if (duration) {
            this.scene.time.addEvent({
                delay: duration, callback: () => {
                    this.stats.speed -= mod
                },
            });
        }
    }

    public setFeatures(features: EntityConfig) {
        const dhp = features.stats.hp - this.stats.hp
        const ds = features.stats.speed - this.stats.hp

        if (dhp !== 0) {
            this.modHp(dhp)
        }
        if (ds !== 0) {
            this.modSpeed(ds)
        }

        // do the same for setPosition as above ??
        this.setPosition(features.x, features.y)
    }

    public modHp(mod: number) {
        if (this.modable) {
            const scene = (this.scene as MainScene)

            const prev = this.stats.hp

            this.stats.hp = Phaser.Math.Clamp(prev + mod, 0, this.maxHp)

            if (this.stats.hp != prev) {

                if (scene.multiplayer.game?.players[this.name]) {
                    this.emit("player.hp.changed", mod)
                    if (!this.isFriendly()) {
                        this.emit("entity.hp.changed", mod)
                    }
                } else {
                    this.emit("entity.hp.changed", mod)
                }
            }

            if (this.stats.hp <= 0) {
                this.modable = false

                scene.components.destroyComponent(this, Movement)

                this?.anims.play("death", true).once("animationcomplete", () => {
                    this.scene.events.emit("entity.destroy", this)
                })
            }
        }
    }

    public modMp(mod: number) {
        if (this.modable) {
            const scene = (this.scene as MainScene)

            const prev = this.stats.mp

            this.stats.mp = Phaser.Math.Clamp(this.stats.mp + mod, 0, this.maxMp)

            if (this.stats.hp != prev) {
                if (scene.multiplayer.game?.players[this.name]) {
                    this.emit("player.mp.changed", mod)
                }
            }

        }
    }
}

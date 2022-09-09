import 'phaser';
import MainScene, { getRandom } from '../scenes/mainScene';
import Movement from "../components/movement"
import short from "short-uuid"
import DynamicTxt, { DynamicTxtConfig } from '../components/dynamicTxt';

const nameof = <T>(name: Extract<keyof T, string>): string => name;
export interface ITextureList {
    [key: string]: string
}

export type EntityConfig = {
    name?: string,//also id
    type: string,
    x: number,
    y: number,
    hp: number,
    speed: number,
    attackSpeed: number //attacks per second
}
export default class Entity extends Phaser.Physics.Arcade.Sprite {
    public speed: number
    protected hp: number

    readonly maxHp: number

    protected attackSpeed: number //attacks per second

    protected attackTimer?: Phaser.Time.TimerEvent

    constructor(scene: MainScene, config: EntityConfig) {
        super(scene, config.x, config.y, config.type, 0)

        this.type = config.type;

        this.speed = config.speed
        this.hp = config.hp
        this.maxHp = config.hp
        this.attackSpeed = config.attackSpeed

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
    }

    public resetAttackTimer() {
        this.attackTimer = this.scene.time.addEvent({
            delay: 1000 / this.attackSpeed,
        });
    }

    public getAttackSpeed() {
        return this.attackSpeed
    }

    //to add special effects
    public modAttackSpeed(mod: number, duration?: number) {
        this.attackSpeed += mod
        if (duration) {
            this.scene.time.addEvent({
                delay: duration, callback: () => {
                    this.attackSpeed -= mod
                },
            });
        }
    }

    public getSpeed() {
        return this.speed
    }

    //to add special effects
    public modSpeed(mod: number, duration?: number) {
        this.speed += mod
        if (duration) {
            this.scene.time.addEvent({
                delay: duration, callback: () => {
                    this.speed -= mod
                },
            });
        }
    }

    public getHp() {
        return this.hp
    }

    public setFeatures(features: EntityConfig) {
        const dhp = features.hp - this.getHp()
        const ds = features.speed - this.getHp()

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
        const scene = (this.scene as MainScene)

        this.hp = Phaser.Math.Clamp(this.hp + mod, 0, this.maxHp)

        if (this.hp <= 0) {
            scene.components.removeComponent(this, Movement)

            this?.anims.play("death", true).once("animationcomplete", () => {
                this.scene.events.emit("entity.destroy", this)
            })
        } else {
            this.scene.events.emit("entity.damaged", this, mod)
        }
    }
}

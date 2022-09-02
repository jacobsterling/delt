import 'phaser';
import MainScene, { getRandom } from '../scenes/mainScene';
import Movement from "../components/movement"
import short from "short-uuid"
import DynamicTxt, { DynamicTxtConfig } from '../hud/dynamicTxt';

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

    protected attackSpeed: number //attacks per second

    protected attackTimer?: Phaser.Time.TimerEvent

    constructor(scene: MainScene, config: EntityConfig) {
        super(scene, config.x, config.y, config.type, 0)

        this.type = config.type;

        this.speed = config.speed
        this.hp = config.hp
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

    public modHp(mod: number) {

        const scene = (this.scene as MainScene)

        this.hp += mod

        console.log(this.hp)

        if (this.hp <= 0) {
            scene.components.removeComponent(this, Movement)

            this?.anims.play("death", true).once("animationcomplete", () => {
                if (!scene.multiplayer) {
                    this.destroy()
                    scene.entityPhysics.kill(this)
                } else if (scene.multiplayer.players[this.name]) {
                    this.emit("player.destroy")
                } else if (scene.multiplayer.isHost()) {
                    this.destroy()
                    scene.entityPhysics.kill(this)
                }
            })

        } else {
            const { x, y } = this.getTopCenter()

            var ax = getRandom(10, 70)
            const ay = getRandom(20, 50)

            var vx = getRandom(0, 50)
            const vy = getRandom(-10, -70)

            var color = "#FF0000"

            //heals
            if (mod > 0) {
                ax = -ax
                vx = -vx
                color = "#00FF00"
            }

            const config: DynamicTxtConfig = {
                x,
                y,
                txt: mod.toString(),
                lifetime: 1000,
                movement: {
                    velocity: new Phaser.Math.Vector2(vx, vy),
                    acceleration: new Phaser.Math.Vector2(ax, ay)
                },
                style: {
                    color,
                    fontSize: "17px"
                }
            }

            new DynamicTxt(scene, config)
        }
    }
}

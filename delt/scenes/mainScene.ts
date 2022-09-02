import ComponentService from '../services/componentService';
import PhaserMultiplayerPlugin from "../plugins/multiplayer";
import Entity from '../entities/entity';
import Affector from "../entities/affector"

export const radToDeg = (rad: number) => rad * (180 / Math.PI)

export const getRandom = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}
export default class MainScene extends Phaser.Scene {
    public components!: ComponentService
    public multiplayer?: PhaserMultiplayerPlugin;
    public entityPhysics!: Phaser.Physics.Arcade.Group;
    public affectors!: Phaser.Physics.Arcade.Group;

    constructor() {
        super({
            key: 'MainScene',
        })
    }

    init() {
        this.multiplayer = new PhaserMultiplayerPlugin(this.plugins)
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

    create = () => { }

    public update = (t: number, dt: number) => {
        this.components.update(dt)
    }
}



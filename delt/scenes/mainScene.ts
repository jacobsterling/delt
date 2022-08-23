import 'phaser';
import { Wizard } from '../entities/wizard';
import keyboardBindings from '../keyboardBindings';
import * as Fire from '../emitters/fire';
import { Emitter } from '../emitters/fire';
import PhaserWebsocketMultiplayerPlugin, { EmitterData, Vector2 } from '../websockets';
import establishMultiplayer from '../websockets.config';
import WizardBlue from '../assets/WizardBlue';
import { Entity } from '../entities/entity';

export type Entities = { [id: string]: Entity };

export default class MainScene extends Phaser.Scene {
    public image!: Phaser.GameObjects.Image;
    public player!: Wizard;
    public emitter!: Emitter;
    public entities: Entities = {};
    public multiplayer!: PhaserWebsocketMultiplayerPlugin;

    constructor() {
        super({ key: 'MainScene' });
    }

    public preload = () => {
        Wizard.preloadTextures(this);
        Fire.preload(this);
    }

    public create = () => {
        keyboardBindings(this);
        establishMultiplayer(this);
    }

    public joinGame = (uid: string) => {

        this.multiplayer.createGame("vans dungeon")

        console.log("uid is:", uid)
        //here enter NEAR account id and game name
        this.multiplayer.joinGame("jacob.near", "vans dungeon")

        this.player = new Wizard(this, {
            color: 'blue',
            control: true,
            defaultTexture: WizardBlue.Down
        });

        this.player.setName(uid);
        this.player.create();
        this.entities[uid] = this.player;
        this.multiplayer.registerEntity(uid, this.player);
    }

    public emitEntityProjectile = (spawn: EmitterData) => {
        this.entities[spawn.spawner].emitProjectile(spawn.direction)
    }

    public update = (t: number, dt: number) => {
        Object.entries(this.entities).forEach(([key, entity]) => {
            entity.update(t, dt)
            this.multiplayer.updateEntity(key, entity)
        });
    }
}

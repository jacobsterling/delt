import 'phaser';
import { Wizard } from '../entities/wizard';
import keyboardBindings from '../keyboardBindings';
import * as Fire from '../emitters/fire';
import { Emitter } from '../emitters/fire';
import PhaserWebsocketMultiplayerPlugin from '../websockets';
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

    public joinGame = (id: string, game_id: string) => {
        this.multiplayer.joinGame(game_id)

        console.log("connected")
        this.player = new Wizard(this, {
            color: 'blue',
            control: true,
            defaultTexture: WizardBlue.Down
        });
        this.player.setName(id);
        this.player.create();
        this.entities[id] = this.player;
        this.multiplayer.registerEntity(id, this.player);
    }

    public update = (t: number, dt: number) => {
        Object.entries(this.entities).forEach(([key, entity]) => {
            entity.update(t, dt)
            this.multiplayer.updateEntity(key, entity)
        });
    }
}

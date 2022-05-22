import 'phaser';
import { Wizard } from '../entities/wizard';
import keyboardBindings from '../keyboardBindings';
import * as Fire from '../emitters/fire';
import { Emitter } from '../emitters/fire';
import PhaserWebsocketMultiplayerPlugin from '../websockets';
import establishMultiplayer from '../websockets.config';

export default class MainScene extends Phaser.Scene {
    public image!: Phaser.GameObjects.Image;
    public player!: Wizard;
    public emitter!: Emitter;
    public gameObjects: any[] = [];
    public multiplayer!: PhaserWebsocketMultiplayerPlugin;

    constructor() {
        super({ key: 'MainScene' });
    }

    public preload = () => {
        Wizard.preloadTextures(this);
        Fire.preload(this);
    }

    public create = () => {
        this.player = new Wizard(this, {
            color: 'blue',
            control: true,
            id: this.multiplayer.id
        });
        this.player.setName(this.multiplayer.id);
        this.player.create();
        keyboardBindings(this);
        establishMultiplayer(this);
    }

    public update = (t: number, dt: number) => {
        this.player.update(t, dt);
        
        this.gameObjects.forEach(x => {
            x?.update(t,dt);
        })
    }
}

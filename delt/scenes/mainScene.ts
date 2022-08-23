import 'phaser';
import { Wizard } from '../entities/wizard';
import keyboardBindings from '../keyboardBindings';
import * as Fire from '../emitters/fire';
import { Emitter } from '../emitters/fire';
import PhaserWebsocketMultiplayerPlugin from '../websockets';
import establishMultiplayer, { EmitterData, extractEntityFeatures } from '../websockets.config';
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

    public initialize = (uid: string) => {

        this.player = new Wizard(this, {
            color: 'blue',
            control: true,
            defaultTexture: WizardBlue.Down
        });

        this.player.setName(uid);
        this.player.create();
        this.entities[uid] = this.player;

        this.multiplayer.entitesRegistry[uid] = extractEntityFeatures(this.player)

        this.multiplayer.createGame("van.near", { game_id: "vans dungeon", autoconnect: true })

        //this.multiplayer.getGames()
    }

    public handleEmitter = (spawn: EmitterData) => {
        switch (spawn.type) {
            case "projectile":
                this.entities[spawn.spawner].emitProjectile(spawn.direction)
                break;

            default:
                break;
        }
    }

    public update = (t: number, dt: number) => {
        Object.entries(this.entities).forEach(([id, entity]) => {
            entity.update(t, dt)
            //only updates if connected to game
            if (this.multiplayer.game_id) {
                this.multiplayer.entitesRegistry[id] = extractEntityFeatures(entity)
            }
        });
    }
}



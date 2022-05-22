import 'phaser';
import { Crosshair } from '../hud/crosshair';
import { checkDirection, IMovementSettings } from '../keyboardBindings';
import { Entity } from './entity';
import { Emitter } from '../emitters/fire';
import getMovementSettings from './wizard.movement';
import BlueWizard from "../assets/WizardBlue";
import RedWizard from "../assets/WizardRed";
import MainScene from '../scenes/mainScene';

const Vector2 = Phaser.Math.Vector2

const nameof = <T>(name: Extract<keyof T, string>): string => name;

const getTextures = (color: string): ITextureList => {
    switch (color)
    {
        case 'red':  return RedWizard;
        case 'blue': return BlueWizard;
    }
    return BlueWizard
}

export interface ITextureList {
    [key: string]: string
}

const getRandom = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}

type SafeWizardConfig = {
    color: string;
    control: boolean;
    position: Phaser.Math.Vector2;
    id: string
}

export type WizardConfig = Partial<SafeWizardConfig>;

const defaultConfig: SafeWizardConfig = {
    color: 'red',
    control: false,
    position: new Vector2(getRandom(100, 400), getRandom(100, 400)),
    id: ''
}

export class Wizard extends Entity {

    private static getAllTextures = () => [BlueWizard, RedWizard];
    private crosshair!: Crosshair;
    public declare sprite: Phaser.GameObjects.Image;
    private declare startingPosition: Phaser.Math.Vector2;
    public projectiles: Emitter[] = [];
    public movement!: IMovementSettings[];
    private textures!: any;

    public get interval(): number {
        return this._interval;
    }

    public get velocity(): number {
        return this._velocity;
    }

    private _sprintSpeed: number = 0.5;
    private _walkSpeed: number = 0.2;

    public setSprint = () => {
        this._velocity = this._sprintSpeed;
        this._interval = this._initialInterval * 0.6;
    }
    public setWalk = () => {
        this._velocity = this._walkSpeed;
        this._interval = this._initialInterval;
    }

    constructor(scene: Phaser.Scene, config: WizardConfig = defaultConfig) {
        super(scene, "sprite", config.id);
        this.startingPosition = config.position ?? defaultConfig.position;
        this.crosshair = new Crosshair(scene);
        this._velocity = this._walkSpeed;
        this.textures = getTextures(config?.color ?? defaultConfig.color);
        if (config.control) this.controlCharacter();
    }

    private controlCharacter = () => {
        this.movement = getMovementSettings(this.textures);

        // Create listeners for all keys created in movement
        this.movement.forEach(direction => {
            direction.Keys.forEach(key => {
                this.scene.input.keyboard.addKey(key);
            });
        });
    }

    public static preloadTextures = (scene: MainScene) => {
        const loadImage = (fileName: string) => {
            scene.load.image(nameof(fileName), fileName);
        }

        Wizard.getAllTextures().forEach(texture => {
            Object.values(texture).forEach(x => {
                loadImage(x as string)
            });
        });
    }

    public create = () => {
        this.createImg();
    }

    private createImg = () => {
        console.log(this.scene)
        const img = this.movement?.find(x=>x.isDefault)?.Textures[0];
        let {x, y} = defaultConfig.position;
        x = this.startingPosition?.x ?? x;
        y = this.startingPosition?.y ?? y;

        if (img == null) {
            console.error('No default texture was set for ', this);
            const texture = this.textures.Down;
            console.error(this.textures.Down);
            this.sprite = this.scene.add.image(x, y, this.textures.Down).setScale(5, 5);
            this.sprite.setTexture(this.textures.Down)
            return;
        }
        this.sprite = this.scene.add.image(x, y, img).setScale(5, 5);
    }

    public onMouseMove = (event: Phaser.Input.Pointer) => {
        this.crosshair.onMouseMove(event);
    }

    public onPointerDown = (event: Phaser.Input.Pointer) => {
        this.projectiles.push(new Emitter(this.scene, this.sprite, event))
    }

    public update = (t: number, dt: number) => {
        // Check if every key that has been added to movement has been pressed.
        this.movement?.forEach(direction => checkDirection(this, direction, t, dt));
        this.projectiles.forEach(x => x.update(t, dt));
    }
}

import 'phaser';
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
    switch (color) {
        case 'red': return RedWizard;
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
    startingPosition: Phaser.Math.Vector2;
    id: string;
    defaultTexture: string;
}

export type WizardConfig = Partial<SafeWizardConfig>;

const defaultConfig: SafeWizardConfig = {
    color: 'red',
    control: false,
    startingPosition: new Vector2(getRandom(100, 400), getRandom(100, 400)),
    id: '',
    defaultTexture: getTextures('red').Down,
}

export class Wizard extends Entity {
    private static getAllTextures = () => [BlueWizard, RedWizard];
    public declare sprite: Phaser.GameObjects.Image;
    public movement!: IMovementSettings[];
    private textures!: ITextureList;
    private defaultTexture!: string;
    protected readonly startPosition!: Phaser.Math.Vector2;


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
        this.startPosition = config.startingPosition ?? defaultConfig.startingPosition;
        this._velocity = this._walkSpeed;
        this.textures = getTextures(config?.color ?? defaultConfig.color);
        this.defaultTexture = config.defaultTexture ?? defaultConfig.defaultTexture;
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
        let { x, y } = defaultConfig.startingPosition;
        x = this.startPosition?.x ?? x;
        y = this.startPosition?.y ?? y;
        this.sprite = this.scene.add.image(x, y, this.defaultTexture).setScale(5, 5);
    }

    public onMouseMove = (event: Phaser.Input.Pointer) => {
        // this.crosshair.onMouseMove(event);
    }

    public onPointerDown = (event: Phaser.Input.Pointer) => {
        this.projectiles.push(new Emitter(this.scene, this.sprite, event))

        return this.sprite
    }

    public update = (t: number, dt: number) => {
        // Check if every key that has been added to movement has been pressed.
        this.movement?.forEach(direction => checkDirection(this, direction, t, dt));
        this.projectiles.forEach(x => x.update(t, dt));
    }

    public destroy = () => {
        this.sprite.destroy(true);
        this.projectiles.forEach(x => x.emitter.remove());
    }
}

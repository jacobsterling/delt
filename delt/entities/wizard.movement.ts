import "phaser";
import { IMovementSettings } from "../keyboardBindings";
import { ITextureList, Wizard } from "./wizard";
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;

const getMovementSettings = (wizardTexture: ITextureList): IMovementSettings[] => {

    return ([
        {
            Name: "Sprint",
            isDown: true,
            Keys: [KeyCodes.SHIFT],
            Textures: [],
            Math: (player, t, dt) => (player as Wizard).setSprint(),
        },
        {
            Name: "Sprint",
            isDown: false,
            Keys: [KeyCodes.SHIFT],
            Textures: [],
            Math: (player, t, dt) => (player as Wizard).setWalk(),
        },
        {
            Name: "Down",
            isDown: true,
            Keys: [KeyCodes.S, KeyCodes.DOWN],
            Textures: [wizardTexture.Down],
            Math: (player, t, dt) => player.sprite.y += player.velocity * dt,
            isDefault: true
        },
        {
            Name: "Left",
            isDown: true,
            Keys: [KeyCodes.A, KeyCodes.LEFT],
            Textures: [wizardTexture.Left, wizardTexture.LeftAlt],
            Math: (player, t, dt) => player.sprite.x -= player.velocity * dt,
        },
        {
            Name: "Right",
            isDown: true,
            Keys: [KeyCodes.D, KeyCodes.RIGHT],
            Textures: [wizardTexture.Right, wizardTexture.RightAlt],
            Math: (player, t, dt) => player.sprite.x += player.velocity * dt,
        },
        {
            Name: "Up",
            isDown: true,
            Keys: [KeyCodes.W, KeyCodes.UP],
            Textures: [wizardTexture.Up],
            Math: (player, t, dt) => player.sprite.y -= player.velocity * dt,
        },
    ]);
};

export default getMovementSettings;

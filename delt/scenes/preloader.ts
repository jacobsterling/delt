
import Phaser from "phaser"
import Players from '../assets/Players';
import Image from '../assets/particles/flares.png';
import Json from '../assets/particles/flares.json';

export default class Preloader extends Phaser.Scene {
  constructor() {
    super({
      key: "Preloader"
    })
  }

  preload() {
    //change to load.aesprite
    this.load.spritesheet("wizard", Players.WizardBlue, { frameWidth: 32, frameHeight: 32 })//load these dynamiclly upon creating the first entity of this type, use loaded spritesheet for every entity after
    this.load.atlas('flares', Image, Json);
  }

  create() {
    this.scene.start("MainScene")
  }
}

import Phaser from "phaser"
import PhaserMultiplayerPlugin from "../plugins/multiplayer";

export default class Browser extends Phaser.Scene {
  public games: []
  public multiplayer: PhaserMultiplayerPlugin;

  constructor() {
    super({
      key: "Browser"
    })
  }

  init = () => {
    this.physics.world.setBounds(0, 0, 1920, 1080);
    this.physics.world.setBoundsCollision();

    this.multiplayer = this.plugins.get("multiplayer") as PhaserMultiplayerPlugin

    const browser = this.add.rectangle(0, 0, 900, 400, new Phaser.Display.Color(150, 150, 150).color).setOrigin(0, 0)

    this.physics.add.existing(browser).setCollideWorldBounds(true)

    browser.setInteractive(new Phaser.Geom.Rectangle(0, 0, browser.width, browser.height), Phaser.Geom.Rectangle.Contains)

    this.input.setDraggable(browser);

    browser.on('drag', (_pointer: any, dragX: number, dragY: number) => {
      browser.x = dragX;
      browser.y = dragY;
    }
    );

    //   eyesIcon.on('pointerup', function () {

    //     this.createWindow(Eyes);

    // }, this);
  }



  create = () => {


    //demosContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, demosWindow.width, demosWindow.height), Phaser.Geom.Rectangle.Contains);
  }
}
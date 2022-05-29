import * as Phaser from 'phaser';
import Config from './config';

const launch = (_containerId: any) => {
	return new Phaser.Game(Config.gameConfig);
};

export default launch
export { launch }


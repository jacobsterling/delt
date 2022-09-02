import * as Phaser from 'phaser';
import GetConfig from './services/config';

const launch = (containerId: string) => {
	return new Phaser.Game(GetConfig(containerId).gameConfig);
};

export { launch }
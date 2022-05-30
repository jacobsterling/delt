import GetConfig from './config';

const launch = (containerId: string) => {
	return new Phaser.Game(GetConfig(containerId).gameConfig);
};

export { launch }
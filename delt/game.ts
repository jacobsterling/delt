import MainScene from './scenes/mainScene';

const launch = (containerId: any) => {
	return new Phaser.Game({
		type: Phaser.AUTO,
		width: window.innerWidth,
		height: window.innerHeight,
		scene: [MainScene],
		render: {
			antialias: false,
			pixelArt: true
		}
	});
};

export default launch
export { launch }


import MainScene from './scenes/mainScene';

const launch = (containerId) => {
	return new Phaser.Game({
		type: Phaser.AUTO,
		width: window.innerWidth,
		height: window.innerHeight,
		scene: [MainScene],
		render: {
			antialias: false
		}
	})
};

export default launch
export { launch }


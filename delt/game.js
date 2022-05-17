import { Time } from 'phaser';
import MainScene from './scenes/mainScene';

function launch(containerId) {
	return new Phaser.Game({
		type: Phaser.AUTO,
		width: window.innerWidth,
		height: window.innerHeight,
		scene: [MainScene],
		time: Time
	})
};

export default launch
export { launch }


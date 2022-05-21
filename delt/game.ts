import MainScene from './scenes/mainScene';
import PhaserWebsocketMultiplayerPlugin from './websockets';

const launch = (_containerId: any) => {
	return new Phaser.Game({
		type: Phaser.AUTO,
		width: window.innerWidth,
		height: window.innerHeight,
		scene: [MainScene],
		plugins: {
			global: [{
				key: 'websocket-multiplayer',
				plugin: PhaserWebsocketMultiplayerPlugin,
				mapping: 'multiplayer',
				start: true,
				data: {
					url: "wss://",				// the url of the websocket
					broadcastInterval: 200,		// the interval in milliseconds in which the state of the tracked object is broadcasted
					pauseTimeout: 5000,			// the time (milliseconds) after which a remote object becomes inactive
					deadTimeout: 15000,			// the time after which a remote object is removed
					checkTimeoutsInterval: 100,	// the interval in milliseconds how oft remote objects are checked
					autoConnect: false,			// if the connection should be established automatically
					debug: true  				// if the debug mode is on
				}
			}]
		},
		render: {
			antialias: false,
			pixelArt: true
		}
	});
};

export default launch
export { launch }


import { Scene } from "phaser";
import { Wizard } from "./entities/wizard";
import MainScene from "./scenes/mainScene";

const establishMultiplayer = (scene: MainScene) => {
	scene.multiplayer.event.on('socket.open', () => initConnection(scene), scene);
	scene.multiplayer.event.on(
		'object.create',
		(data: any) => createObject(data, scene),
		scene.multiplayer
	);
	scene.multiplayer.event.on('object.update', (_: any, obj: any, __: any) => {
		updateObjects(obj, scene);
	}, scene.multiplayer);

	scene.multiplayer.track(scene.player.sprite, featureExtractor);
	scene.multiplayer.connect();
}

const featureExtractor = (object: any) => {
	return {
		x: object.x,
		y: object.y,
		type: typeof(object)
	}
}

const createObject = (data: any, scene: MainScene) => {
	const { id } = data;
	
	if (scene.multiplayer.id == id) {
		scene.multiplayer.registerObject(id, data.player);
		return;
	}
	const newWizard = new Wizard(scene, {
		color: 'red',
		position: new Phaser.Math.Vector2(data?.data.x ?? 0, data?.data?.y ?? 0),
		id: id,
	});
	newWizard.preload();
	newWizard.create();
	scene.gameObjects.push(newWizard);
	
}

const updateObjects = (obj: any, scene: MainScene) => {
	const {id, data} = obj;
	const {x, y} = data;
	if (id) {
		const res = scene.gameObjects.find(x=>x.id === id);
		if (!res) return;
		res?.sprite.setPosition(x, y);
	}
}

const initConnection = (scene: MainScene) => {
	scene.multiplayer.startBroadcast();
}

export default establishMultiplayer;

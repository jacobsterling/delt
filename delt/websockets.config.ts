import { Wizard } from "./entities/wizard";
import MainScene from "./scenes/mainScene";

type Vector2 = {
	x: number;
	y: number;
}

export type EntityMessage = {
    position: Vector2;
    type: string;
};

type BasicMessage = {
    id: string;
    data: EntityMessage;
};

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

const featureExtractor = (object: any): EntityMessage | null => {
	if (!object) return null;
	return {
		position: {
			x: object.x,
			y: object.y,
		},
		type: typeof(object)
	};
}

const createObject = (obj: any, scene: MainScene) => {
	const { id, data } = obj;

	if (id === scene.multiplayer.id) return;

	const {x, y} = data.position;
	
	if (scene.multiplayer.id == id) {
		scene.multiplayer.registerObject(id, obj.player);
		return;
	}
	const newWizard = new Wizard(scene, {
		color: 'red',
		position: new Phaser.Math.Vector2(x, y),
		id: id,
	});
	newWizard.preload();
	newWizard.create();
	scene.gameObjects.push(newWizard);
	
}

const updateObjects = (obj: any, scene: MainScene) => {
	const {id, data} = obj;
	if (id) {
		const res = scene.gameObjects.find(x=>x.id === id);
		if (!res) return;
		const {x, y} = data.position;
		res?.sprite.setPosition(x, y);
	}
}

const initConnection = (scene: MainScene) => {
	scene.multiplayer.startBroadcast();
}

export default establishMultiplayer;

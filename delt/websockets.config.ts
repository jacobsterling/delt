import "phaser";
import { Wizard } from "./entities/wizard";
import MainScene from "./scenes/mainScene";

type Vector2 = {
	x: number;
	y: number;
}

export type Entity = {
	id: string
	position: Vector2;
	type: string;
};

type BasicMessage = {
	[id: string]: Entity
};

const establishMultiplayer = (scene: MainScene) => {
	scene.multiplayer.event.on('socket.open', () => initConnection(scene), scene);

	scene.multiplayer.event.on(
		'object.create',
		(entity: Entity) => createEntity(entity, scene),
		scene.multiplayer
	);

	scene.multiplayer.event.on('object.update', (_: any, obj: any, __: any) => {
		updateEntitys(obj, scene);
	}, scene.multiplayer);

	const position: Vector2 = {
		x: 0.0,
		y: 0.0
	}

	const wizard: Entity = {
		id: "player.testnet",
		position: position,
		type: "player"
	}

	scene.multiplayer.registerEntity(wizard);
	scene.multiplayer.connect();
}


const createEntity = (entity: Entity, scene: MainScene) => {
	const { x, y } = entity.position;

	scene.multiplayer.registerEntity(entity);

	const newWizard = new Wizard(scene, {
		color: 'red',
		position: new Phaser.Math.Vector2(x, y),
		id: entity.id,
	});
	newWizard.preload();
	newWizard.create();
	scene.gameObjects.push(newWizard);

}

const updateEntitys = (entitys: [Entity], scene: MainScene) => {
	entitys.forEach((entity: Entity) => {
		const res = scene.gameObjects.find(x => x.id === entity.id);
		if (!res) return;
		const { x, y } = entity.position;
		res?.sprite.setPosition(x, y);
	})
}

const initConnection = (scene: MainScene) => {
	scene.multiplayer.startBroadcast();
}

export default establishMultiplayer;

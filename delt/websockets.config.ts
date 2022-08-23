import "phaser";
import { Entity } from "./entities/entity";
import { Wizard } from "./entities/wizard";
import MainScene from "./scenes/mainScene";

export type Vector2 = {
	x: number;
	y: number;
}

export type EmitterData = {
	type: string;
	direction: Vector2
	spawner: string;
}

export type EntityFeatures = {
	position: Vector2;
	type: string;
};

export type EntitysData = { [id: string]: EntityFeatures; };

const establishMultiplayer = (scene: MainScene) => {

	scene.multiplayer.connect({ url: "ws://localhost:42069" })

	//scene.multiplayer.event.on('socket.open', () => {}, scene);

	scene.multiplayer.event.on('socket.connected', (id: string) => scene.initialize(id), scene);

	// //temporary for testing
	scene.multiplayer.event.on('game.exists', (game_id: string) => scene.multiplayer.joinGame("darkholme.near", game_id), scene);

	scene.multiplayer.event.on('game.joined', () => scene.multiplayer.startBroadcast(scene.player.name), scene);

	scene.multiplayer.event.on('spawn.create', (spawn: EmitterData) => scene.handleEmitter(spawn), scene);

	scene.multiplayer.event.on('entity.update', (id: string, entity: EntityFeatures) => {
		updateClientEntity(id, entity, scene);
	}, scene.multiplayer);

	scene.multiplayer.event.on('entity.create', (id: string, entity: EntityFeatures) => {
		createClientEntity(id, entity, scene);
	}, scene.multiplayer);

	scene.multiplayer.event.on('entity.timeout', (id: string) => {
		delete scene.entities[id];
		delete scene.multiplayer.entitesRegistry[id]
		delete scene.multiplayer.entitesLastseen[id]
	}, scene.multiplayer);
}

export const extractEntityFeatures = (entity: Entity) => {
	const position: Vector2 = {
		x: entity.sprite.x,
		y: entity.sprite.y
	}

	const features: EntityFeatures = {
		position: position,
		type: entity.type,
	}

	return features
}

const createClientEntity = (id: string, entity: EntityFeatures, scene: MainScene) => {

	if (scene.entities[id]) return;

	const { x, y } = entity.position;

	const newWizard = new Wizard(scene, {
		color: 'red',
		startingPosition: new Phaser.Math.Vector2(x, y),
		id,
	});

	newWizard.preload();
	newWizard.create();
	scene.entities[id] = newWizard;
}

const updateClientEntity = (id: string, entity: EntityFeatures, scene: MainScene) => {
	const res = scene.entities[id];
	if (!res) return;
	if (res.name == id) return;
	const { x, y } = entity.position;
	res?.sprite.setPosition(x, y);
}

export default establishMultiplayer;

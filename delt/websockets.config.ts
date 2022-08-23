import "phaser";
import { Emitter } from "./emitters/fire";
import { Wizard } from "./entities/wizard";
import MainScene from "./scenes/mainScene";
import { EmitterData, EntityData, Vector2 } from "./websockets";

const establishMultiplayer = (scene: MainScene, game_id: string = "global") => {
	scene.multiplayer.event.on('socket.open', () => scene.multiplayer.init(), scene);

	scene.multiplayer.event.on('object.update', (id: string, entity: EntityData) => {
		updateClientEntity(id, entity, scene);
	}, scene.multiplayer);

	scene.multiplayer.event.on('object.create', (id: string, entity: EntityData) => {
		createClientEntity(id, entity, scene);
	}, scene.multiplayer);

	scene.multiplayer.event.on('object.kill', (id: string, entity: EntityData) => {
		killClientEntity(id, entity, scene);
	}, scene.multiplayer);

	scene.multiplayer.event.on('socket.connected', (id: string) => scene.joinGame(id), scene);

	scene.multiplayer.event.on('spawn.create', (spawn: EmitterData) => scene.emitEntityProjectile(spawn), scene);

	scene.multiplayer.connect("ws://localhost:42069");
}

const createClientEntity = (id: string, entity: EntityData, scene: MainScene) => {
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

const updateClientEntity = (id: string, entity: EntityData, scene: MainScene) => {
	if (id == scene.multiplayer.id) return;
	const res = scene.entities[id];
	if (!res) return;
	const { x, y } = entity.position;
	res?.sprite.setPosition(x, y);
}

const killClientEntity = (id: string, entity: EntityData, scene: MainScene) => {
	delete scene.entities[id];
}

export default establishMultiplayer;

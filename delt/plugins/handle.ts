import { Bolt } from "../entities/projectiles/bolt"
import Affector, { AffectorConfig } from "../entities/affector"
import Entity, { EntityConfig } from "../entities/entity"
import PhaserMultiplayerPlugin from "./multiplayer"
import { getRandom } from "../scenes/mainScene"
import Player from "../entities/player"

const deserializeJsonResponse = (data: string) => {
	try {
		return JSON.parse(data);
	}
	catch {
		console.error(`Did not receive JSON. Insead, received \'${data}\'`);
		return null;
	}
}

const handle = (msg: string, multiplayer: PhaserMultiplayerPlugin) => {
	const res = deserializeJsonResponse(msg ?? '')
	if (res == null) return;

	switch (res?.msg_type) {
		case "notification":
			console.warn(res?.msg)
			break

		//used for temp object creation
		case "spawn":
			delete res.msg_type
			if (multiplayer.scene) {
				const features = extractAffectorFeatures(res.spawn)

				const spawner = multiplayer.scene.children.getByName(res?.spawer)

				if (spawner) {
					features.spawner = spawner as Phaser.Physics.Arcade.Sprite
				}

				switch (res.spawn.type) {
					case "bolt":
						new Bolt(multiplayer.scene, features)

					default:
						new Affector(multiplayer.scene, features)
				}
			}
			break

		case "despawn":
			delete res.msg_type
			if (multiplayer.scene) {
				const spawn = multiplayer.scene.children.getByName(res?.spawn_id)

				if (spawn) {
					spawn.destroy()
				}
			}
			break

		case "affect":
			delete res.msg_type
			if (multiplayer.scene) {
				const affected = (multiplayer.scene.children.getByName(res?.affected_id) as Entity)

				const affector = (multiplayer.scene.children.getByName(res?.affector_id) as Affector)

				if (affector) {
					try {
						affector?.affect(affected)
					} catch (error) {
						switch (error.message) {
							case "affector.affect is not a function":
								break;

							default:
								console.error(error)
								break
						}
					}
				}
			}
			break

		case "update":
			delete res.msg_type
			if (multiplayer.scene) {
				const server_tick_duration = res.tick as number

				Object.entries(res).forEach(([key, element]) => {
					switch (key) {
						case "entities":
							Object.entries(Object(element)).forEach(([id, entity]) => {

								const features = extractEntityFeatures(entity)

								const object = multiplayer.scene.children.getByName(id) as Entity;

								if (!object) {
									new Entity(multiplayer.scene, features)
								} else {
									//predictive movement ???
									const dhp = features.hp - object.getHp()
									const ds = features.speed - object.getHp()

									if (dhp != 0) {
										object.modHp(dhp)
									}

									if (ds != 0) {
										object.modSpeed(ds)
									}

									//do the same for setPosition as above ??
									object.setPosition(features.x, features.y)

								}
								multiplayer.entitesLastseen[id] = (new Date()).getTime()
							}
							)
							break;

						case "players":
							Object.entries(Object(element)).forEach(([id, player]) => {
								const features = extractEntityFeatures(player)
								const object = multiplayer.scene.children.getByName(id) as Player;

								if (object && id != multiplayer.self_id) {
									const dhp = features.hp - object.getHp()
									const ds = features.speed - object.getHp()

									if (dhp != 0) {
										object.modHp(dhp)
									}
									if (ds != 0) {
										object.modSpeed(ds)
									}

									//do the same for setPosition as above ??
									object.setPosition(features.x, features.y)
								} else if (!object) {
									if (features.name) {
										if (features.name != multiplayer.self_id) {

											//creates other player
											multiplayer.players[features.name] = new Player(multiplayer.scene, {
												control: false,
												...features
											}).setImmovable()
										} else {

											//creates self
											multiplayer.players[features.name] = new Player(multiplayer.scene, {
												control: true,
												...features
											})
										}
									}
								}
								multiplayer.entitesLastseen[id] = (new Date()).getTime()
							}
							)
							break;

						case "game_state":
							multiplayer.game_state = Object.assign(multiplayer.game_state, element)
							multiplayer.events.emit('game.updated', multiplayer.game_state);
							//have object.create in here when difference in game data
							break;

						default:
							break;
					}
				})
			}
			break;

		case "joined":
			console.warn(res?.msg)
			multiplayer.game_id = res?.game_id
			multiplayer.host_id = res?.host_id
			console.warn("joined ", multiplayer.game_id)
			break;

		case "created":
			multiplayer.events.emit('game.created', res?.game_id);
			break;

		case "left":
			multiplayer.events.emit('game.left', multiplayer.game_id);
			multiplayer.broadcast = false
			multiplayer.game_id = undefined;
			multiplayer.host_id = undefined;
			break;

		case "info":
			delete res.msg_type
			const game_id = res.game_id;
			delete res.game_id;
			multiplayer.games[game_id] = res;
			multiplayer.events.emit('game.added', game_id);
			console.table(multiplayer.games)
			break;

		case "ended":
			multiplayer.events.emit('game.ended', multiplayer.game_id);
			break;

		case "connected":
			multiplayer.self_id = res?.id

			//testing purposes
			// multiplayer.createGame("van.near", {
			// 	game_id: "vans dungeon",
			// 	autoconnect: {
			// 		control: true,
			// 		type: "wizard",
			// 		x: getRandom(100, 400),
			// 		y: getRandom(100, 400),
			// 		hp: 100,
			// 		speed: 200,
			// 		attackSpeed: 3
			// 	}
			// })
			break;

		case "error":
			console.warn(res?.msg)
			multiplayer.events.emit('socket.error', res?.msg);

			// //temporary for testing 2 players
			// if (res?.msg == "Game id already exists") {
			// 	multiplayer.joinGame("darkholme.near", res?.game_id, {
			// 		control: true,
			// 		type: "wizard",
			// 		x: getRandom(100, 400),
			// 		y: getRandom(100, 400),
			// 		hp: 100,
			// 		speed: 200,
			// 		attackSpeed: 3,
			// 	})
			// }
			break;

		case "msg":
			console.info(res?.msg)
			multiplayer.events.emit('message.recieved', res?.msg);
			break;

		default:
			//console.warn("Unexpected message", data?.msg)
			break;
	}
}

export const extractAffectorFeatures = (affector: any) => {
	const features: AffectorConfig = {
		x: affector.x,
		y: affector.y,
		speed: affector.speed,
		direction: affector.direction,
		texture: affector.texture,
		id: affector.id,
		type: affector.type,
		affects: affector.affects,
		width: affector.width,
		height: affector.height
	}

	return features
}

export const extractEntityFeatures = (entity: any) => {
	const features: EntityConfig = {
		name: entity.name,
		x: entity.x,
		y: entity.y,
		hp: entity.hp,
		speed: entity.speed,
		type: entity.type,
		attackSpeed: entity.attackSpeed
	}

	return features
}


export default handle
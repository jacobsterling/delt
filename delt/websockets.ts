import "phaser";
import { Emitter } from "./emitters/fire";
import { Entity } from "./entities/entity";
import { Wizard } from "./entities/wizard";
import { EmitterData, EntityFeatures, EntitysData } from "./websockets.config";

// Based on: https://github.com/joemoe/phaser-websocket-multiplayer-plugin

//this file just sends/receives data from server

const deserializeJsonResponse = (data: string) => {
	try {
		return JSON.parse(data);
	}
	catch {
		console.error(`Did not receive JSON. Insead, received \'${data}\'`);
		return null;
	}
}

export type gameConfig = {
	account_id?: string,
	game_id?: string,
	privite?: boolean,
	whitelist?: [],
	password?: string,
	data?: {},
	autoconnect: boolean
};
export default class PhaserWebsocketMultiplayerPlugin extends Phaser.Plugins.BasePlugin {
	event: Phaser.Events.EventEmitter;
	declare socket: WebSocket;

	broadcastInterval!: number;
	checkTimeoutsInterval!: number;

	entitesRegistry: EntitysData = {};
	entitesLastseen: { [id: string]: number; } = {};

	game_state: { [id: string]: any } = {}

	host_id: string | undefined;
	game_id: string | undefined;

	config: {
		url: string; // the url of the websocket
		broadcastInterval: number; // the interval in milliseconds in which the state of the tracked object is broadcasted
		pauseTimeout: number; // the time (milliseconds) after which a remote object becomes inactive
		deadTimeout: number; // the time after which a remote object is removed
		checkTimeoutsInterval: number; // the interval in milliseconds how oft remote objects are checked
	};

	constructor(pluginManager: any) {
		super(pluginManager);
		this.game = pluginManager.game;
		this.event = new Phaser.Events.EventEmitter();

		this.entitesRegistry = {};
		this.entitesLastseen = {};

		this.config = {
			url: '',					// the url of the websocket
			broadcastInterval: 200,		// the interval in milliseconds in which the state of the tracked object is broadcasted
			pauseTimeout: 5000,			// the time (milliseconds) after which a remote object becomes inactive
			deadTimeout: 15000,			// the time after which a remote object is removed
			checkTimeoutsInterval: 100,	// the interval in milliseconds how oft remote objects are checked
		};
	}

	connect(config = {}) {
		this.config = Object.assign(this.config, config);
		this.socket = new WebSocket(this.config.url);
		this.socket.addEventListener('open', this.onSocketOpen.bind(this));
		this.socket.addEventListener('message', this.onSocketMessage.bind(this));
		this.socket.addEventListener('close', this.onSocketClose.bind(this));
		this.socket.addEventListener('error', this.onSocketError.bind(this));
	}

	createGame(account_id: string, game_config: gameConfig = {
		autoconnect: false
	}) {

		game_config.account_id = account_id

		this.broadcastMessage("create", game_config)

		if (game_config.autoconnect && game_config.account_id) {
			this.event.on('game.created', (game_id: string) => {
				console.warn(game_id, " created.")
				this.joinGame(account_id, game_id)
			}
			);
		}
	}

	joinGame(account_id: string, game_id: string) {
		this.broadcastMessage("join", { "account_id": account_id, "game_id": game_id })
	}

	getGames() {
		this.broadcastMessage("list", {})
	}

	checkTimeouts() {
		let currentTime = (new Date()).getTime();

		Object.entries(this.entitesLastseen).forEach(([id, value]) => {
			if (typeof value != "number") return
			if (currentTime - value > this.config.deadTimeout) {
				this.event.emit('entity.timeout', id);
			}
		});
	}

	onSocketOpen(event: any) {
		this.event.emit('socket.open', event);
		this.checkTimeoutsInterval = setInterval(this.checkTimeouts.bind(this), this.config.checkTimeoutsInterval);
	}

	onSocketMessage(event: any) {
		const res = deserializeJsonResponse(event?.data ?? '')
		if (res == null) return;

		switch (res?.msg_type) {
			case "notification":
				console.warn(res?.msg)
				break;

			case "list":
				delete res.msg_type
				console.table(res)
				this.event.emit('game.list', res);
				break;

			//used for temp object creation
			case "spawn":
				delete res.msg_type
				Array(res?.spawns).forEach(([spawn]) => {
					this.event.emit('spawn.create', spawn)
				})
				break;

			case "update":
				delete res.msg_type
				Object.entries(res).forEach(([key, element]) => {
					switch (key) {
						case "entities":
							Object.entries(Object(element)).forEach(([id, entity]) => {
								if (!this.entitesRegistry[id]) {
									this.event.emit('entity.create', id, entity)
								} else {
									this.event.emit('entity.update', id, entity)
								}
								this.entitesLastseen[id] = (new Date()).getTime()
							}
							)
							break;

						case "data":
							this.game_state = Object.assign(this.game_state, element)
							this.event.emit('game.updated', this.game_state);
							//have object.create in here when difference in game data ??

							break;

						default:
							break;
					}
				})
				break;

			case "joined":
				this.game_id = res?.game_id
				this.host_id = res?.host_id
				this.event.emit('game.joined');
				break;

			case "created":
				this.event.emit('game.created', res?.game_id);
				break;

			case "left":
				this.event.emit('game.left', this.game_id);
				this.game_id = undefined;
				break;

			case "connected":
				this.event.emit('socket.connected', res?.id); //game id
				break;

			case "error":
				console.warn(res?.msg)
				this.event.emit('socket.error', res?.msg);

				if (res?.msg == "Game id already exists") {
					this.event.emit('game.exists', res?.game_id);
				}
				break;

			case "msg":
				console.info(res?.msg)
				this.event.emit('message.recieved', res?.msg);
				break;

			default:
				//console.warn("Unexpected message", data?.msg)
				break;
		}
	}

	onSocketError(event: any) {
		this.event.emit('socket.error', event);
	}

	onSocketClose(event: any) {
		clearInterval(this.checkTimeoutsInterval);
		this.stopBroadcast();
		this.game_id = undefined;
		this.event.emit('socket.close', event);
	}

	startBroadcast(id: string) {
		this.broadcastInterval = setInterval(
			() => {
				//add field for game data

				this.broadcastMessage("update", { "self": this.entitesRegistry[id] });
			},
			this.config.broadcastInterval
		);
	}

	stopBroadcast() {
		clearInterval(this.broadcastInterval);
	}

	broadcastMessage = (msg_type: string, data: { [id: string]: any }) => {
		data["msg_type"] = msg_type
		this.socket.send(JSON.stringify(data))
	}
}
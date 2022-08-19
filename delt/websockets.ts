import "phaser";
import { Entity } from "./entities/entity";

// Based on: https://github.com/joemoe/phaser-websocket-multiplayer-plugin

const deserializeJson = (data: string) => {
	try {
		return JSON.parse(data);
	}
	catch {
		console.error(`Did not receive JSON. Insead, received \'${data}\'`);
		return null;
	}
}

const constructBasicMessage = (msg_type: string, data: { [id: string]: any }) => {
	data["msg_type"] = msg_type
	return JSON.stringify(data)
}

type Vector2 = {
	x: number;
	y: number;
}

export type EntityData = {
	position: Vector2;
	type: string;
};

export type EntitysData = { [id: string]: EntityData; };
export default class PhaserWebsocketMultiplayerPlugin extends Phaser.Plugins.BasePlugin {
	event: Phaser.Events.EventEmitter;
	declare socket: WebSocket;

	broadcastInterval!: number;
	checkTimeoutsInterval!: number;

	entitesRegistry: EntitysData = {};
	entitesLastseen: { [id: string]: number; } = {};

	id: string | undefined;
	game_id: string | undefined;

	config: {
		url: string; // the url of the websocket
		broadcastInterval: number; // the interval in milliseconds in which the state of the tracked object is broadcasted
		pauseTimeout: number; // the time (milliseconds) after which a remote object becomes inactive
		deadTimeout: number; // the time after which a remote object is removed
		checkTimeoutsInterval: number; // the interval in milliseconds how oft remote objects are checked
		autoConnect: boolean; // if the connection should be established automatically
		debug: boolean; // if the debug mode is on
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
			autoConnect: false,			// if the connection should be established automatically
			debug: false
		};
	}

	init(config = {}) {
		this.config = Object.assign(this.config, config)
		if (this.config.autoConnect) this.connect();
	}

	connect(url = '') {
		url === '' ? url = this.config.url : url
		this.log('trying to connect');
		this.socket = new WebSocket(url);
		this.socket.addEventListener('open', this.onSocketOpen.bind(this));
		this.socket.addEventListener('message', this.onSocketMessage.bind(this));
		this.socket.addEventListener('close', this.onSocketClose.bind(this));
		this.socket.addEventListener('error', this.onSocketError.bind(this));
	}

	onSocketOpen(event: any) {
		this.log('socket open')
		this.event.emit('socket.open', event);
		this.checkTimeoutsInterval = setInterval(this.checkTimeouts.bind(this), this.config.checkTimeoutsInterval);
	}

	onSocketMessage(event: any) {
		const data = deserializeJson(event?.data ?? '');
		if (data == null) return;

		switch (data?.msg_type) {
			case "notification":
				console.log(data?.msg)
				break;

			case "update":
				delete data.msg_type
				Object.entries(data).forEach(([key, element]) => {
					const entity = this.extractEntityData(element)
					console.log(key)
					if (!this.entitesRegistry[key]) {
						this.entitesRegistry[key] = entity;
						this.event.emit('object.create', key, entity);
						this.log('create', JSON.stringify(entity));
					} else {
						this.event.emit('object.update', key, entity);
					}
					this.entitesLastseen[key] = (new Date()).getTime();
				})

				break;

			case "error":
				console.log(data?.msg)
				break;

			case "msg":
				console.log(data?.msg)
				break;

			case "joined":
				this.game_id = data?.game_id
				this.startUpdate()
				break;

			case "connected":
				this.id = data?.id
				this.event.emit('socket.connected', data?.id, "vans dungeon"); //game id
				break;

			default:
				//pong ??
				break;
		}
	}

	onSocketError(event: any) {
		this.event.emit('socket.error', event);
	}

	onSocketClose(event: any) {
		clearInterval(this.checkTimeoutsInterval);
		this.stopBroadcast();
		this.event.emit('socket.close', event);
	}

	checkTimeouts() {
		let currentTime = (new Date()).getTime();

		Object.entries(this.entitesLastseen).forEach(([key, value]) => {
			if (typeof value != "number") return
			if (currentTime - value > this.config.deadTimeout)
				this.killEntity(key);
		});
	}

	registerEntity(id: string, entity: Entity) {
		const entityData = this.extractEntityFeatures(entity)
		this.entitesRegistry[id] = entityData
	}

	updateEntity(id: string, entity: Entity) {
		const entityData = this.extractEntityFeatures(entity)

		if (this.entitesRegistry[id]) {
			this.entitesRegistry[id] = Object.assign(this.entitesRegistry[id], entityData)
		}
	}

	extractEntityFeatures(entity: Entity) {
		const position: Vector2 = {
			x: entity.sprite.x,
			y: entity.sprite.y
		}
		const data: EntityData = {
			position: position,
			type: entity.type
		}

		return data
	}

	extractEntityData(entity: any) {
		const data: EntityData = {
			position: entity.position,
			type: entity.type
		}

		return data
	}

	killEntity(id: string) {
		this.event.emit('object.kill', this.entitesRegistry[id], id);
		delete this.entitesRegistry[id];
		delete this.entitesLastseen[id];
	}

	joinGame(game_id: string) {
		const msg = constructBasicMessage("join", { ["game_id"]: game_id })

		this.broadcast(msg)
	}

	login(account_id: string) {
		const msg = constructBasicMessage("login", { ["account_id"]: account_id })

		this.broadcast(msg)
	}

	sendMessage(message: string = "") {
		const msg = constructBasicMessage("msg", { ["msg"]: message })

		this.broadcast(msg)
	}

	startUpdate() {
		this.broadcastInterval = setInterval(
			() => {
				this.broadcast(constructBasicMessage("update", this.entitesRegistry));
			},
			this.config.broadcastInterval
		);
	}

	broadcast(msg: string) {
		if (this.socket) {
			this.socket.send(msg);
		} else {
			console.log(this.socket)
		}

	}

	stopBroadcast() {
		clearInterval(this.broadcastInterval);
	}

	log(msg: string, data: any = '') {
		if (this.config.debug)
			console.log('WEBSOCKET MULTIPLAYER: ' + msg, data);
	}
}
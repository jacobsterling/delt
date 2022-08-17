import "phaser";
import { Entity } from "./websockets.config";

// Based on: https://github.com/joemoe/phaser-websocket-multiplayer-plugin

const deserializeJsonToBasicMessage = (data: string) => {
	try {
		return JSON.parse(data);
	}
	catch {
		console.error(`Did not receive JSON. Insead, received \'${data}\'`);
		return null;
	}
}

export default class PhaserWebsocketMultiplayerPlugin extends Phaser.Plugins.BasePlugin {
	event: Phaser.Events.EventEmitter;
	declare socket: WebSocket;

	broadcastInterval!: number;
	checkTimeoutsInterval!: number;

	objectRegistry: { [id: string]: any; } = {};
	objectLastseen: { [id: string]: any; } = {};

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

		this.objectRegistry = {};
		this.objectLastseen = {};

		this.config = {
			url: "",					// the url of the websocket
			broadcastInterval: 200,		// the interval in milliseconds in which the state of the tracked object is broadcasted
			pauseTimeout: 5000,			// the time (milliseconds) after which a remote object becomes inactive
			deadTimeout: 15000,			// the time after which a remote object is removed
			checkTimeoutsInterval: 100,	// the interval in milliseconds how oft remote objects are checked
			autoConnect: false,			// if the connection should be established automatically
			debug: false				// if the debug mode is on
		};
	}

	init(config = {}) {
		this.config = Object.assign(this.config, config);
		if (this.config.autoConnect) this.connect();
	}

	connect(url = '') {
		if (url == '')
			url = this.config.url;
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
		const data = deserializeJsonToBasicMessage(event?.data ?? '');
		if (data == null) return;

		console.log(data)
		//update data with json
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

		Object.entries(this.objectLastseen).forEach(([key, value]) => {
			if (typeof value != "number") return
			if (currentTime - value > this.config.deadTimeout)
				this.killObject(key);
		});
	}

	registerEntity(entity: Entity) {
		this.objectRegistry[entity.id] = entity;
	}

	killObject(id: string) {
		this.event.emit('object.kill', this.objectRegistry[id], id);
		delete this.objectRegistry[id];
		delete this.objectLastseen[id];
	}

	updateObject(data: Object) {
		Object.entries(data).forEach(([key, element]) => {
			if (!this.objectRegistry[key]) {
				this.objectRegistry[key] = element;
				this.event.emit('object.create', element);
				this.log('create', JSON.stringify(element));
			} else {
				this.event.emit('object.update', this.objectRegistry[key], element);
			}
			this.objectLastseen[key] = (new Date()).getTime();
		})
	}

	startBroadcast() {
		this.broadcastInterval = setInterval(
			() => {
				this.broadcast(this.objectRegistry);
			},
			this.config.broadcastInterval
		);
	}

	broadcast(msg: Object) {
		this.socket.send(JSON.stringify(msg));
	}

	stopBroadcast() {
		clearInterval(this.broadcastInterval);
	}

	log(msg: string, data: any = '') {
		if (this.config.debug)
			console.log('WEBSOCKET MULTIPLAYER: ' + msg, data);
	}
}
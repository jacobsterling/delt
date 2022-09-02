import Phaser from "phaser"
import Player, { PlayerConfig } from "../entities/player"
import MainScene from "../scenes/mainScene"
import handle, { extractEntityFeatures } from "./handle"

// Based on: https://github.com/joemoe/phaser-websocket-multiplayer-plugin

export type gameConfig = {
	account_id?: string,
	game_id?: string,
	privite?: boolean,
	whitelist?: [],
	password?: string,
	data?: {},
	autoconnect?: PlayerConfig
};

export default class PhaserMultiplayerPlugin extends Phaser.Plugins.BasePlugin {
	events: Phaser.Events.EventEmitter;
	declare socket: WebSocket;

	broadcastInterval!: number;
	checkTimeoutsInterval!: number;

	entitesLastseen: { [id: string]: number; } = {};

	broadcast: boolean

	game_state: { [id: string]: any } = {}

	games: { [id: string]: any } = {}//game browser

	players: { [id: string]: Player } = {};

	scene: MainScene

	self_id: string | undefined;
	game_id: string | undefined;
	host_id: string | undefined;

	retry: number

	config: {
		url: string; // the url of the websocket
		broadcastInterval: number; // the interval in milliseconds in which the state of the tracked object is broadcasted
		pauseTimeout: number; // the time (milliseconds) after which a remote object becomes inactive
		deadTimeout: number; // the time after which a remote object is removed
		checkTimeoutsInterval: number; // the interval in milliseconds how oft remote objects are checked
	};

	constructor(pluginManager: Phaser.Plugins.PluginManager) {
		super(pluginManager);
		this.events = new Phaser.Events.EventEmitter();

		this.scene = this.game.scene.getScene("MainScene") as MainScene

		this.entitesLastseen = {};

		this.broadcast = false

		this.retry = 0

		this.config = {
			url: '',					// the url of the websocket
			broadcastInterval: 200,		// the interval in milliseconds in which the state of the tracked object is broadcasted
			pauseTimeout: 5000,			// the time (milliseconds) after which a remote object becomes inactive
			deadTimeout: 15000,			// the time after which a remote object is removed
			checkTimeoutsInterval: 100,	// the interval in milliseconds how oft remote objects are checked
		};

		this.connect({ url: "ws://localhost:42069" })
	}

	connect(config = {}) {
		this.config = Object.assign(this.config, config);
		this.socket = new WebSocket(this.config.url);
		this.socket.addEventListener('open', this.onSocketOpen.bind(this));
		this.socket.addEventListener('message', this.onSocketMessage.bind(this));
		this.socket.addEventListener('close', this.onSocketClose.bind(this));
		this.socket.addEventListener('error', this.onSocketError.bind(this));
	}

	createGame(account_id: string, game_config: gameConfig) {

		game_config.account_id = account_id

		this.broadcastMessage("create", game_config)

		this.events.on('game.created', (game_id: string) => {
			console.warn(game_id, " created.")
			if (game_config.autoconnect) { this.joinGame(account_id, game_id, game_config.autoconnect) }
		}
		);
	}

	joinGame(account_id: string, game_id: string, self_data: PlayerConfig) {
		this.broadcastMessage("join", { "account_id": account_id, "game_id": game_id, "data": self_data })
	}

	isHost() {
		if (this.host_id) {
			return this.host_id == this.self_id
		} else {
			return true
		}
	}

	getGames() {
		this.broadcastMessage("list", {})
	}

	checkTimeouts() {
		let currentTime = (new Date()).getTime();

		Object.entries(this.entitesLastseen).forEach(([id, value]) => {
			if (typeof value != "number") return
			if (currentTime - value > this.config.deadTimeout) {
				delete this.entitesLastseen[id]
			}
		});
	}

	onSocketMessage(event: any) {
		handle(event.data, this)
	}

	onSocketOpen(event: any) { }

	onSocketError(event: any) { }

	onSocketClose(event: any) {
		this.broadcast = false
		this.game_id = undefined;
		if (this.scene) {
			this.scene.scene.start("Preloader")
		}
	}

	broadcastMessage = async (msg_type: string, data: { [id: string]: any }) => {
		data["msg_type"] = msg_type//used to inforce a msg_type
		if (this.socket && this.self_id) {
			this.socket.send(JSON.stringify(data))
		}
	}

	broadcastSelf(dt: number) {
		if (this.broadcast && this.self_id) {
			this.broadcastMessage("update", { "self": extractEntityFeatures(this.scene.children.getByName(this.self_id)) })
		}
	}

	delay(ms: number) {
		return new Promise(resolve => setTimeout(() => { }, ms));
	}
}
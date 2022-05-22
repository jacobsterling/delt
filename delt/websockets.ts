const MESSAGE_TYPE = {
	UPDATE_OBJECT: 'update.object',
	KILL_OBJECT: 'kill.object',
	ACTION_START: 'action.start',
	ACTION_STOP: 'action.stop'
}

// Based on: https://github.com/joemoe/phaser-websocket-multiplayer-plugin

const deserializeJsonToBasicMessage = (data: string): BasicMessage | null => {
	try {
		return JSON.parse(data);
	}
	catch {
		console.error(`Did not receive JSON. Insead, received \'${data}\'`);
		return null;
	}
}

export type BasicMessage = {
	id: string;
	objects: any;
	type: string;
	actionType: string;
};

export type BasicMessageReceived = {
	id: string;
	data: any;
}

export default class PhaserWebsocketMultiplayerPlugin extends Phaser.Plugins.BasePlugin  {
    event: Phaser.Events.EventEmitter;
    declare socket: WebSocket;
    id: string;
    name!: string;
    localObject: any;
    featureExtractor: any;
    broadcastInterval!: NodeJS.Timer;
    checkTimeoutsInterval!: NodeJS.Timer;
    objectRegistry: { [id: string] : any; } = {};
    objectLastseen: { [id: string] : any; } = {};
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
        		
		this.id = ((1<<24)*Math.random() | 0).toString(16);

		this.objectRegistry = {};
		this.objectLastseen = {};

		this.config =  {
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
		if(this.config.autoConnect) this.connect();
		
		if (this.config.debug)
		{
			console.log(`I am ${this.id}`);
		}
	}

	connect(url = '') {
		if(url == '') 
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
		const data: BasicMessage | null = deserializeJsonToBasicMessage(event?.data ?? '');
		if (data == null) return;
				
		// You already know your data, so no need to update yourself
		if(data?.id == this.id) return;

		switch(data.type) {
			case MESSAGE_TYPE.UPDATE_OBJECT:
				this.updateObject(data);
			break;
			case MESSAGE_TYPE.KILL_OBJECT:
				this.killObject(data.id);
			break;
			case MESSAGE_TYPE.ACTION_START:
				let objects = [];

				for(let i = 0; i < data?.objects?.length ?? 0; i++) {
					if(this.objectRegistry[data.objects[i]])
						objects.push(this.objectRegistry[data.objects[i]]);
				}

				this.event.emit('action.start.' + data.actionType, data.id, objects);
			break;
			case MESSAGE_TYPE.ACTION_STOP:
				this.event.emit('action.stop.' + data.actionType, data.id);
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
		
		this.socket.send('heartbeat');
		
		Object.entries(this.objectLastseen).forEach(([key, value]) => {
            if (typeof value != "number") return
    		if(currentTime - value > this.config.pauseTimeout)
    			this.pauseObject(key);
    		if(currentTime - value > this.config.deadTimeout)
    			this.killObject(key);
		});
	}

	setName(name: string) {
		this.name = name;
	}

	registerObject(id: string, object: any) {
		this.objectRegistry[id] = object;
		object.setData('id', id);
	}

	pauseObject(id: string) {
		this.event.emit('object.pause', this.objectRegistry[id], id);
	}

	killObject(id: string) {
		this.event.emit('object.kill', this.objectRegistry[id], id);
		delete this.objectRegistry[id];
		delete this.objectLastseen[id];
	}

	updateObject(data: any) {
		const { objects } = data;
		if ((objects?.length ?? 0) < 1 ) return;
		objects?.forEach((element: BasicMessageReceived ) => {
			if(!this.objectRegistry[element.id]) {
				this.objectRegistry[element.id] = true;
				this.event.emit('object.create', element);
				this.log('create', element.data);
			}
			else
			{
				this.event.emit('object.update', this.objectRegistry[element.id], element.data, element.id);
			}
			this.objectLastseen[element.id] = (new Date()).getTime();
		});

	}

	track(object: any, featureExtractor: any) {
		this.localObject = object;
		object.setData('id', this.id);
		this.featureExtractor = featureExtractor;
		this.registerObject(this.id, object);
	}

	startBroadcast() {
		this.broadcastInterval = setInterval(
			() => { this.broadcast(); },
			this.config.broadcastInterval
		);
	}

	broadcast() {
		this.socket.send(JSON.stringify({
			type: MESSAGE_TYPE.UPDATE_OBJECT,
			id: this.id,
			data: this.featureExtractor(this.localObject)
		}));
	}

	stopBroadcast() {
		clearInterval(this.broadcastInterval);
	}


	startAction(actionType = 'generic', objects = []) {
		this.socket.send(JSON.stringify({
			id: this.id,
			type: MESSAGE_TYPE.ACTION_START,
			actionType: actionType,
			objects: objects
		}));
	}

	stopAction(actionType = 'generic') {
		this.socket.send(JSON.stringify({
			id: this.id,
			type: MESSAGE_TYPE.ACTION_STOP,
			actionType: actionType
		}));
	}


	log(msg: string, data = ' ') {
		if(this.config.debug)
			console.log('WEBSOCKET MULTIPLAYER: ' + msg, data);
	}
}
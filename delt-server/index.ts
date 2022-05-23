import {WebSocketServer} from 'ws';

console.log('Starting sockets');

const wss = new WebSocketServer({
  port: 42069,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024, // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  },
});

console.log('Sockets set up. Waiting for connection...');

export type BasicMessageReceived = {
  id: string;
  type: string
  data: any;
};

interface Vector2 {
  x: number,
  y: number
}

interface Listeners {
  on: (message: string, predicate: (data: any) => void) => void
}

enum MessageTypes {
  UPDATE_OBJECT = 'update.object',
  KILL_OBJECT = 'kill.object',
  ACTION_START = 'action.start',
  ACTION_STOP = 'action.stop',
}

type Client = {
  id: string;
  ws: WebSocket & Listeners;
  isAlive: boolean;
  data: BasicMessageReceived | null;
}

const getClients = () => clientList.map((x) => ({id: x.id, data: x.data}));

// const clientData: { [id: string] : Vector2; } = {};
const clientList: Client[] = [];

const initializationMessage = () => {
  return {
    type: MessageTypes.UPDATE_OBJECT,
    objects: clientList.map((x)=>x.data),
  };
};

const updateMessage = () => {
  return {
    type: MessageTypes.UPDATE_OBJECT,
    objects: getClients(),
  };
};

wss.on('connection', (ws: WebSocket & Listeners) => {
  console.log('connection established!');
  ws.on('message', (data: any) => {
    const charCode: string = String.fromCharCode(...data);

    // Polling to check if client connection is active
    if (isHeartBeat(charCode)) {
      handleHeartBeat();
      return;
    }
    const message = tryReadMessage(charCode);
    if (message == null) return;
    if ((message?.id?.length ?? 0) === 0) return;
    if (Object.keys(message?.data ?? {}).length === 0) return;
    const index: number = clientList.findIndex((x) => x.id == message.id);
    if (index == -1) {
      clientList.push({
        id: message.id,
        ws: ws,
        isAlive: true,
        data: message.data,
      });
      return;
    }
    clientList[index].data = message;
  });

  const handleHeartBeat = () => {
    const x = clientList.find((o) => o.ws === ws);
    if (x == null) return;
    x.isAlive = true;
  };

  ws.send(JSON.stringify(initializationMessage()));
});

// Update interval (tick)
const tick = 64;

// Do not change
const interval = 1000 / tick;
setInterval(()=> {
  const update = updateMessage();
  // if (update.objects.length < 2) {
  //   return;
  // }
  const json = JSON.stringify(update);
  wss.clients.forEach((client) => client.send(json));
}, interval);

// Heartbeat interval
setInterval(() => {
  clientList.forEach((clnt, index) => {
    if (clnt.isAlive === false) {
      console.log('[-]', clnt.id, 'has Disconnected.');
      wss.emit('customClose', clnt.id);
      clnt.ws.close();
      clientList.splice(index, 1);
    }
    clnt.isAlive = false;
  });
}, 5000);

const isHeartBeat = (message: string): boolean => {
  return message === 'heartbeat';
};

const tryReadMessage = (charCode: string): BasicMessageReceived | null => {
  try {
    return JSON.parse(charCode);
  } catch {
    console.error(`Could not parse ${charCode}`);
    return null;
  }
};


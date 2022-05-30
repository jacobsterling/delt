import {getHash} from './identityHub';
import {
  BasicMessageReceived,
  Client,
  DeltSocket,
  MessageTypes,
} from './messageTypes';
import {useStore} from './store';

const listeners = (ws: DeltSocket) => {
  ws.on('message', (data: any) => message(ws, useStore().clientList, data));
};

const isHeartBeat = (message: BasicMessageReceived): boolean => (
  message.type === MessageTypes.HEART_BEAT
);

const tryReadMessage = (charCode: string): BasicMessageReceived | null => {
  try {
    return JSON.parse(charCode);
  } catch {
    console.error(`Could not parse ${charCode}`);
    return null;
  }
};

const handleHeartBeat = (msg: BasicMessageReceived, clientList: Client[]) => {
  const x = clientList.find((o) => o.id === msg.id);
  if (x == null) return;
  x.isAlive = true;
};

const isNewClient = (i: number): boolean => i == -1;
const addClient = (
    clientList: Client[],
    message: BasicMessageReceived,
    ws: DeltSocket,
) => {
  const msg: Client = {
    id: message.id,
    ws: ws,
    isAlive: true,
    hasInitialized: false,
    hashedId: getHash(message.id),
    data: message.data,
  };
  console.log(`Adding ${msg.id} (${msg.hashedId})`);
  clientList.push(msg);
};

const message = (ws: DeltSocket, clientList: Client[], data: any) => {
  const charCode: string = String.fromCharCode(...data);

  // Polling to check if client connection is active
  const message = tryReadMessage(charCode);
  if (message == null) return;
  if (isHeartBeat(message)) {
    handleHeartBeat(message, clientList);
    return;
  }
  if ((message?.id?.length ?? 0) === 0) return;
  if (Object.keys(message?.data ?? {}).length === 0) return;
  const index: number = clientList.findIndex((x) => x.id == message.id);
  if (isNewClient(index)) {
    addClient(clientList, message, ws);
    return;
  }
  clientList[index].isAlive = true;
  Object.assign(clientList[index].data, message.data);
};

export default listeners;

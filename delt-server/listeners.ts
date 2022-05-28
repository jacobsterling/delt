import {BasicMessageReceived, Client, DeltSocket} from './messageTypes';

const listeners = (ws: DeltSocket, clientList: Client[]) => {
  ws.on('message', (data: any) => message(ws, clientList, data));
};

const isHeartBeat = (message: string): boolean => (
  message === 'heartbeat'
);

const tryReadMessage = (charCode: string): BasicMessageReceived | null => {
  try {
    return JSON.parse(charCode);
  } catch {
    console.error(`Could not parse ${charCode}`);
    return null;
  }
};

const handleHeartBeat = (ws: DeltSocket, clientList: Client[]) => {
  const x = clientList.find((o) => o.ws === ws);
  if (x == null) return;
  x.isAlive = true;
};

const message = (ws: DeltSocket, clientList: Client[], data: any) => {
  const charCode: string = String.fromCharCode(...data);

  // Polling to check if client connection is active
  if (isHeartBeat(charCode)) {
    handleHeartBeat(ws, clientList);
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
};

export default listeners;

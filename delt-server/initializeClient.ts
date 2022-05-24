import {Client, DeltSocket, MessageTypes} from './messageTypes';

const initializationMessage = (clientList: Client[]) => {
  return {
    type: MessageTypes.UPDATE_OBJECT,
    objects: clientList.map((x)=>x.data),
  };
};

const initializeClient = (ws: DeltSocket, clientList: Client[] ) => {
  ws.send(JSON.stringify(initializationMessage(clientList)));
};

export default initializeClient;

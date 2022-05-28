import {WebSocketServer} from 'ws';
import {Client} from './messageTypes';
import Config from './config';

const store: IStore = {
  clientList: [],
  wss: new WebSocketServer(Config.wsConfig),
};

export interface IStore {
  clientList: Client[];
  wss: WebSocketServer;
}

const getClientList = () => store.clientList;
const getWss = () => store.wss;

const updateClient = (client: Client, updatedClient: Client) => {
  const index = store.clientList.findIndex((x) => x.id, client.id);
  if (index === -1) return;
  Object.assign(store.clientList[index], updatedClient);
};

export const useStore = () => ({
  clientList: getClientList(),
  wss: getWss(),
  updateClient: updateClient,
});

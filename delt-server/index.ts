import {WebSocketServer} from 'ws';
import {Client, Listeners} from './messageTypes';
import Config from './config';
import heartbeat from './heartbeat';
import update from './update';
import listeners from './listeners';
import initializeClient from './initializeClient';

const clientList: Client[] = [];
const wss = new WebSocketServer(Config.wsConfig);

export interface IStore {
  clientList: Client[];
  wss: WebSocketServer;
}

const getClientList = () => clientList;
const getWss = () => wss;
export const useStore = () => ({
  clientList: getClientList(),
  wss: getWss(),
});


const launch = () => {
  console.log('Starting sockets');
  console.log('Sockets set up. Waiting for connection...');
  wss.on('connection', (ws: WebSocket & Listeners) => {
    console.log('connection established!');
    listeners(ws);
    initializeClient(ws);
    update();
    heartbeat();
  });
};

launch();

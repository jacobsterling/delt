import {WebSocketServer} from 'ws';
import {Client, Listeners} from './messageTypes';
import Config from './config';
import heartbeat from './heartbeat';
import update from './update';
import listeners from './listeners';
import initializeClient from './initializeClient';

const clientList: Client[] = [];

export const launch = () => {
  console.log('Starting sockets');
  const wss = new WebSocketServer(Config.wsConfig);
  console.log('Sockets set up. Waiting for connection...');
  wss.on('connection', (ws: WebSocket & Listeners) => {
    console.log('connection established!');
    listeners(ws, clientList);
    initializeClient(ws, clientList);
    update(clientList, wss);
    heartbeat(clientList, wss);
  });
};

launch();

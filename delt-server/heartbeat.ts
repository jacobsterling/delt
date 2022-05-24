import {Server, WebSocket} from 'ws';
import {Client} from './messageTypes';
import Config from './config';

// Heartbeat interval
const heartbeat = (clientList: Client[], wss: Server<WebSocket>) => {
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
  }, Config.timeoutInterval);
};

export default heartbeat;

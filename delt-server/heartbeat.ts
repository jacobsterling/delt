import Config from './config';
import {useStore} from './store';

// Heartbeat interval
const heartbeat = () => {
  setInterval(() => {
    const {wss, clientList} = useStore();
    clientList.forEach((clnt, index) => {
      if (clnt.isAlive === false) {
        console.log(`[-]' ${clnt.id} (${clnt.hashedId}) 'has Disconnected.`);
        wss.emit('customClose', clnt.hashedId);
        clnt.ws.close();
        clientList.splice(index, 1);
      }
      clnt.isAlive = false;
    });
  }, Config.timeoutInterval);
};

export default heartbeat;

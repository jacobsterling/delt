import {Listeners} from './messageTypes';
import heartbeat from './heartbeat';
import update from './update';
import listeners from './listeners';
import {useStore} from './store';


const launch = () => {
  console.log('Starting sockets');
  console.log('Sockets set up. Waiting for connection...');
  const {wss} = useStore();
  wss.on('connection', (ws: WebSocket & Listeners) => {
    console.log('connection established!');
    listeners(ws);
    update();
    heartbeat();
  });
};

launch();

import {useStore} from './store';
import {Client, MessageTypes} from './messageTypes';

const secureClient = (client: Client, id: string) =>
  client.id === id ? client.id : client.hashedId;

const initializationMessage = (clientList: Client[], id: string) => {
  return ({
    type: MessageTypes.UPDATE_OBJECT,
    objects: clientList.map((x) => ({
      id: secureClient(x, id),
      data: x.data,
    })).filter((x)=>x?.data !== undefined && x?.data !== null),
  });
};

const initializeClient = (client: Client) => {
  const {clientList} = useStore();
  const msg = initializationMessage(clientList, client.id);
  client.hasInitialized = true;
  if (!msg) return;
  // console.log('Sending initialization message', JSON.stringify(msg));
  // client.ws.send(JSON.stringify(msg));
};

export default initializeClient;

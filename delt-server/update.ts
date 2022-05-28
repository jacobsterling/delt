import {useStore} from './store';
import Config from './config';
import {
  BasicKillSend,
  BasicMessageSend,
  Client,
  MessageTypes,
} from './messageTypes';
import initializeClient from './initializeClient';

const interval = 1000 / Config.tick;

const constructData = (clnt: Client, to: Client): BasicMessageSend => ({
  id: clnt.id == to.id ? clnt.id : clnt.hashedId,
  data: clnt.data,
});

const getClients = (clientList: Client[], client: Client) => (
  clientList.map((x) => constructData(x, client))
);

const updateMessage = (clientList: Client[], client: Client) => ({
  type: MessageTypes.UPDATE_OBJECT,
  objects: getClients(clientList, client),
});

const getKillMessage = (client: Client, hashedId: string): BasicKillSend => ({
  type: MessageTypes.KILL_OBJECT,
  id: hashedId == client.hashedId ? client.id : hashedId,
});

export const sendKillUpdate = (hashedId: string) => {
  const {clientList} = useStore();
  clientList.forEach((x) => {
    x.ws.send(JSON.stringify(getKillMessage(x, hashedId)));
  });
};

const update = () => {
  setInterval(()=> {
    const {clientList} = useStore();
    clientList.forEach((client) => {
      const update = updateMessage(clientList, client);
      const json = JSON.stringify(update);
      if (!client.hasInitialized) {
        initializeClient(client);
        return;
      }
      client.ws.send(json);
    });
  }, interval);
};

export default update;

import config from './config.json';
import {ServerOptions} from 'ws';

const Config: IConfig = config as IConfig;

interface IConfig {
  wsConfig: ServerOptions,
  tick: number, // How many times a second we check for updates
  timeoutInterval: number // Time in heartbeat
}

export default Config;

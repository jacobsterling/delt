import PhaserWebsocketMultiplayerPlugin from "./websockets"
import ConfigJson from './config.Debug.json';
import MainScene from "./scenes/mainScene";

interface IConfig {
	debug: boolean,
	gameConfig: Phaser.Types.Core.GameConfig
}

type PluginObject = Phaser.Types.Core.PluginObject;
type PluginObjectItem = Phaser.Types.Core.PluginObjectItem;
const checkIsPluginObject = (obj: any): obj is PluginObject =>
	(((<PluginObject>obj).global !== undefined)
	&& ((<PluginObject>obj).global?.length ?? 0) > 0);

const hasSpecificPlugin = (plugins: PluginObjectItem[] | undefined, key: string) =>
	plugins?.find((x: PluginObjectItem) => x.key == key);

const insertPluginClass = (key: string, className: Class, conf: IConfig) => {
	const { plugins } = conf.gameConfig;
	if (plugins && checkIsPluginObject(plugins))
	{
		const plugin = hasSpecificPlugin(plugins.global, key);
		if (plugin)
		{
			plugin.plugin = className;	
		}
	}
}

const GetConfig = (containerId: string): IConfig => {
	const conf: IConfig = ConfigJson
	conf.gameConfig.scene = [MainScene];
	insertPluginClass("websocket-multiplayer", PhaserWebsocketMultiplayerPlugin, conf);
	conf.gameConfig.parent = containerId;
	return conf;
};

export default GetConfig;

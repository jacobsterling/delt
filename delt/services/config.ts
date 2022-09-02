import 'phaser';
import PhaserMultiplayerPlugin from "../plugins/multiplayer";
import ConfigJson from './config.Debug.json';
import MainScene from "../scenes/mainScene";
import Preloader from '../scenes/preloader';
import Browser from '../scenes/browser';

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
	if (plugins && checkIsPluginObject(plugins)) {
		const plugin = hasSpecificPlugin(plugins.global, key);
		if (plugin) {
			plugin.plugin = className;
		}
	}
}

const GetConfig = (containerId: string): IConfig => {
	const conf: IConfig = ConfigJson
	insertPluginClass("multiplayer", PhaserMultiplayerPlugin, conf)
	conf.gameConfig.scene = [Browser, Preloader, MainScene]
	conf.gameConfig.scale = {
		// Fit to window
		mode: Phaser.Scale.FIT,
		// Center vertically and horizontally
		autoCenter: Phaser.Scale.CENTER_BOTH
	}
	conf.gameConfig.parent = containerId
	return conf;
};

export default GetConfig;

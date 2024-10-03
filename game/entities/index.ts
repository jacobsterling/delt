/* eslint-disable indent */

import BaseScene from "../scenes/baseScene"
import Entity from "./entity"
import Player, { PlayerAttributes, PlayerConfig } from "./player"
import { Bolt, BoltConfig } from "./projectiles/bolt"

export enum EntityTypes {
  player,
  bolt
}

export interface DefaultAttributes {
  hp: number
  max_hp: number,
  speed: number
  mp: number
  max_mp: number,
}

export type Attributes = PlayerAttributes | DefaultAttributes

export interface DefaultDisplay {
  width: number
  height: number
  name?: string
  texture: string
}

export type DisplayConfigs = DefaultDisplay

export type EntityFeatures = {
  display: DisplayConfigs
  manager: string
  attributes: Attributes
  position: Phaser.Math.Vector2
  type: keyof typeof EntityTypes
}

export enum ModableAttributes {// must match key of attributes struct
  hp,
  hp_regen,
  max_hp,
  mp,
  mp_regen,
  max_mp,
  speed,
  attack_speed,
}

export type EntityConfigs = PlayerConfig | BoltConfig

export default (scene: BaseScene, name: string, config: EntityConfigs): Entity => {
  switch (config.type) {
    case "player":
      return new Player(scene, config as PlayerConfig).spawn(name)
    case "bolt":
      return new Bolt(scene, config as BoltConfig).spawn(name)
    default:
      return new Entity(scene, config).spawn(name)
  }
}

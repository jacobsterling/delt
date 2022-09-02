import Phaser from "phaser"
import Affector from "./affector";
import Entity from "./entity"

export type Affect = (entity: Entity, self: Affector) => void

export interface Effect {
  effects:
  {
    [id: string]: number
  },
  affect: Affect
}

export type Affects = {
  [id: string]: Effect
};

const affects: Affects = {
  "magic damage": {

    effects:
    {
      damage: 5
    },

    affect: (entity: Entity, self: Affector) => {
      const dmg = affects["magic damage"].effects.damage

      entity.modHp(-dmg)

      self.destroy()
    },
  }
}

export default affects
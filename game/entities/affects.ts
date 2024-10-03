import Entity from "./entity"

export interface Effect {
  effects:
  {
    [id: string]: number
  },
  affect: (entity: Entity, affector?: Entity) => void
}

export type Affects = {
  [id: string]: Effect
};

export const affects: Affects = {
  "magic damage": {
    affect: (entity: Entity, affector?: Entity) => {
      const dmg = affects["magic damage"].effects.damage

      if (affector && !affector.allies.includes(entity) && entity.mod) {
        entity.mod("hp", -dmg)
      }
    },

    effects:
    {
      damage: 10
    }
  }
}

export default affects

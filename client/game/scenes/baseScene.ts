/* eslint-disable no-case-declarations */
/* eslint-disable camelcase */
/* eslint-disable indent */
import Json from "~~/assets/particles/flares.json"
import Image from "~~/assets/particles/flares.png"
import Players from "~~/assets/Players"
import { WebSocketConnection } from "~~/composables/useWebSocket"
import { ServerUpdate, PlayerStats } from "~~/types/server"

import ComponentService from "../components"
import spawn, { EntityConfigs } from "../entities"
import Entity from "../entities/entity"
import Player, { PlayerConfig } from "../entities/player"
import GameUi from "./gameUi"

export const radToDeg = (rad: number) => rad * (180 / Math.PI)

type Spawn = {
    scene: string,
    zone: [Phaser.Math.Vector2, Phaser.Math.Vector2],
}

export type SessionState = {
    spawn: Spawn,
    entities: EntityConfigs[],
    pending_spawns: { [new_id: string]: string }
    destroyed_entities: EntityConfigs[],
    stats: { [id: string]: PlayerStats }
    data: { [tag: string]: any },
}

export const getRandom = (min: number, max: number): number => {
    return Math.random() * (max - min) + min
}

export default class BaseScene extends Phaser.Scene {
    public components!: ComponentService
    public ws!: WebSocketConnection
    public entityPhysics!: Phaser.Physics.Arcade.Group
    public ui!: GameUi

    public spawn_zone!: [Phaser.Math.Vector2, Phaser.Math.Vector2]

    public player?: Player

    constructor() {
        super({
            key: "BaseScene"
        })
    }

    init({ session, state }: { session: WebSocketConnection, state: SessionState }) {
        this.ui = this.scene.get("GameUi") as GameUi
        this.ui.mainscene = this
        this.scene.bringToTop(this.ui)
        this.ws = session
        this.components = new ComponentService()

        this.physics.world.setBounds(0, 0, 1920, 1080)
        this.physics.world.setBoundsCollision()

        this.entityPhysics = this.physics.add.group()

        this.physics.add.collider(this.entityPhysics, this.entityPhysics, (entity1, entity2) => {
            const onContact1 = (entity1 as Entity).onContact

            if (onContact1) {
                onContact1(entity2 as Entity)
            }

            const onContact2 = (entity2 as Entity).onContact

            if (onContact2) {
                onContact2(entity1 as Entity)
            }
        })

        this.updateState(state, 0)
    }

    preload() {
        // change to load.aesprite
        this.load.spritesheet("wizard", Players.WizardBlue, { frameHeight: 32, frameWidth: 32 })// load these dynamiclly upon creating the first entity of this type, use loaded spritesheet for every entity after
        this.load.atlas("flares", Image, Json)
    }

    create = () => {
        // create mapz

        this.ws.events.on("session.update", this.onServerUpdate, this)
        this.ws.events.on("session.tick", this.updateState, this)

        const config: PlayerConfig = {
            attributes: {
                attack_speed: 0.5,
                hp: 100,
                hp_regen: 1,
                max_hp: 100,
                max_mp: 100,
                mp: 100,
                mp_regen: 1,
                speed: 200
            },
            display: {
                height: 10,
                name: this.ws.username,
                texture: "wizard",
                width: 10
            },
            manager: this.ws.username,
            position: new Phaser.Math.Vector2(getRandom(this.spawn_zone[0].x, this.spawn_zone[1].x), getRandom(this.spawn_zone[0].y, this.spawn_zone[1].y)),
            type: "player"
        }

        // eslint-disable-next-line no-new
        new Player(this, config)
    }

    onServerUpdate = ({ update_type, update }: ServerUpdate) => {
        switch (update_type) {
            case "affect":
                const { affector, affectors, affected } = update as { affector: string, affectors: string[], affected: string[] }
                const entity = this.children.getByName(affector) as Entity | undefined
                if (entity) {
                    const entities: Entity[] = []
                    for (const id of affected) {
                        const affected_entity = this.children.getByName(id) as Entity | undefined
                        if (affected_entity) {
                            entities.push(affected_entity)
                        }
                    }
                    entity.affect(affectors, entities)
                }
                break

            default:
                break
        }
    }

    public updateState = (state: SessionState, dt: number) => {
        this.spawn_zone = state.spawn.zone
        for (const [id, name] of Object.entries(state.pending_spawns)) {
            console.log(id, name)
            const entity = this.children.getByName(id) as Entity
            if (entity) {
                entity.spawn(name)
                delete this.ws.session!.update.spawns[id]
            }
        }
        for (const [id, config] of Object.entries(state.entities)) {
            if (this.ws.username !== config.manager) {
                const entity = this.children.getByName(id) as Entity || spawn(this, id, config)
                entity.setPushable(false)
                entity.updateConfig(config, dt)
            }
        }
        for (const id of Object.keys(state.destroyed_entities)) {
            const idx = this.ws.session!.update.kill_list.indexOf(id)

            if (idx > -1) {
                delete this.ws.session!.update.kill_list[idx]
                delete this.ws.session!.update.active[id]
            }
            this.children.getByName(id)?.destroy()
        }
    }

    public update = (_t: number, dt: number) => {
        this.components.update(dt)
        this.ws.update(this)
    }
}

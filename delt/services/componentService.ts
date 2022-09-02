import Phaser from "phaser";
import short from "short-uuid"

export type Constructor<T extends {} = {}> = new (...args: any[]) => T

//https://www.youtube.com/watch?v=qzsbGLghrMM

export interface IComponent {
  init: (go: Phaser.Physics.Arcade.Sprite) => void

  awake?: () => void
  start?: () => void
  update?: (dt: number) => void

  destroy?: () => void
}

export default class ComponentService {
  private componentsByGameObject = new Map<string, IComponent[]>()
  private queuedForStart: IComponent[] = []

  addComponent(go: Phaser.Physics.Arcade.Sprite, component: IComponent) {
    if (!go.name) {
      go.name = short.generate()
    }

    if (!this.componentsByGameObject.has(go.name)) {
      this.componentsByGameObject.set(go.name, [])
    }

    const list = this.componentsByGameObject.get(go.name) as IComponent[]

    list.push(component)

    component.init(go)

    if (component.awake) {
      component.awake()
    }

    if (component.start) {
      this.queuedForStart.push(component)
    }
  }

  findComponent<ComponentType>(go: Phaser.GameObjects.GameObject, componentType: Constructor<ComponentType>) {
    const components = this.componentsByGameObject.get(go.name)
    if (!components) {
      return null
    }

    return components.find(component => components instanceof componentType)
  }

  removeComponent<ComponentType>(go: Phaser.GameObjects.GameObject, componentType: Constructor<ComponentType>) {
    const components = this.componentsByGameObject.get(go.name)
    if (components) {
      components.forEach((component, i, list) => {
        if (component instanceof componentType) {
          delete list[i]
        }
      }
      )
      this.componentsByGameObject.set(go.name, components)
    }
  }

  destroy() {
    Object.values(this.componentsByGameObject).forEach((component: IComponent) => {
      if (component.destroy) {
        component.destroy()
      }
    })
  }

  update(dt: number) {
    while (this.queuedForStart.length > 0) {
      const component = this.queuedForStart.shift()
      if (component?.start) {
        component.start()
      }
    }

    for (const [, components] of this.componentsByGameObject.entries()) {
      components.forEach(component => {
        if (component.update) {
          component.update(dt)
        }
      })
    }
  }
}
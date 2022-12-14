import Phaser from "phaser"

export type Constructor<T extends {} = {}> = new (...args: any[]) => T

// https://www.youtube.com/watch?v=qzsbGLghrMM

export interface IComponent {
  init: (go: Phaser.Physics.Arcade.Sprite) => void

  update?: (dt: number) => void

  destroy?: () => void
}

export default class ComponentService {
  private componentsByGameObject = new Map<string, IComponent[]>()

  addComponent(go: Phaser.Physics.Arcade.Sprite, component: IComponent) {
    if (!this.componentsByGameObject.has(go.name)) {
      this.componentsByGameObject.set(go.name, [])
      go.on("destroy", () => {
        const components = this.componentsByGameObject.get(go.name)
        components!.forEach((component, _i, _list) => {
          if (component.destroy) {
            component.destroy()
          }
        })
        this.componentsByGameObject.delete(go.name)
      })
    }

    const list = this.componentsByGameObject.get(go.name) as IComponent[]

    list.push(component)

    component.init(go)
  }

  findComponent<ComponentType extends {}>(go: Phaser.GameObjects.GameObject, componentType: Constructor<ComponentType>) {
    const components = this.componentsByGameObject.get(go.name)
    if (!components) {
      return null
    }

    return components.find(_component => components instanceof componentType)
  }

  destroyComponent<ComponentType extends {}>(go: Phaser.GameObjects.GameObject, componentType: Constructor<ComponentType>) {
    const components = this.componentsByGameObject.get(go.name)
    if (components) {
      components.forEach((component, i, list) => {
        if (component instanceof componentType) {
          const comp = list[i]
          if (comp.destroy) {
            comp.destroy()
          }
          delete list[i]
        }
      }
      )
      this.componentsByGameObject.set(go.name, components)
    }
  }

  destroy() {
    for (const components of this.componentsByGameObject.values()) {
      components!.forEach((component, _i, _list) => {
        if (component.destroy) {
          component.destroy()
        }
      })
    }
    this.componentsByGameObject = new Map<string, IComponent[]>()
  }

  update(dt: number) {
    for (const [, components] of this.componentsByGameObject.entries()) {
      components.forEach((component) => {
        if (component.update) {
          component.update(dt)
        }
      })
    }
  }
}

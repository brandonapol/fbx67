import * as pc from 'playcanvas'
import { weather } from '../../text-game/src/story.ts'
import type { Figure, Prop, Space } from './levels.ts'
import { owenLook, spaces } from './levels.ts'
import type { Lighting } from './lighting.ts'
import { lighting } from './lighting.ts'
import type { Game } from './prologue.ts'

export type View = Readonly<{
  app: pc.Application
  camera: pc.Entity
  sync: (g: Game, dt: number) => void
  groundAt: (x: number, y: number) => Readonly<{ x: number; z: number }> | undefined
}>

const color = (hex: string, a = 1): pc.Color => {
  const n = parseInt(hex.slice(1), 16)
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a)
}

const material = (hex: string, opts: Readonly<{ glow?: boolean; opacity?: number; unlit?: boolean }> = {}): pc.StandardMaterial => {
  const m = new pc.StandardMaterial()
  m.diffuse = color(hex)
  m.gloss = 0.15
  m.metalness = 0
  m.useMetalness = true
  if (opts.glow) {
    m.emissive = color(hex)
    m.emissiveIntensity = 1.4
  }
  if (opts.opacity !== undefined) {
    m.opacity = opts.opacity
    m.blendType = pc.BLEND_NORMAL
    m.depthWrite = false
  }
  if (opts.unlit) {
    m.useLighting = false
    m.emissive = color(hex)
  }
  m.update()
  return m
}

const primitive = (
  parent: pc.Entity,
  type: 'box' | 'cylinder' | 'cone' | 'sphere' | 'capsule',
  hex: string,
  pos: readonly [number, number, number],
  size: readonly [number, number, number],
  opts: Readonly<{ glow?: boolean; shadows?: boolean }> = {},
): pc.Entity => {
  const e = new pc.Entity(type)
  e.addComponent('render', { type, castShadows: opts.shadows ?? true, receiveShadows: true })
  if (e.render) e.render.material = material(hex, { glow: opts.glow })
  e.setLocalPosition(pos[0], pos[1], pos[2])
  e.setLocalScale(size[0], size[1], size[2])
  parent.addChild(e)
  return e
}

const addProp = (root: pc.Entity, p: Prop): void => {
  if (p.h < 0.02) return
  const y = (p.y ?? 0) + p.h / 2
  primitive(root, p.shape ?? 'box', p.color, [p.box.x, y, p.box.z], [p.box.w, p.h, p.box.d], { glow: p.glow, shadows: !p.glow })
}

const addFigure = (root: pc.Entity, f: Figure): pc.Entity => {
  const e = new pc.Entity(f.id)
  const body = f.height * 0.62
  primitive(e, 'capsule', f.coat, [0, body / 2 + 0.05, 0], [0.5, body / 2, 0.4])
  primitive(e, 'sphere', f.skin, [0, body + 0.2, 0], [0.32, 0.36, 0.32])
  if (f.hood) {
    primitive(e, 'sphere', f.coat, [0, body + 0.24, -0.04], [0.46, 0.5, 0.46])
    primitive(e, 'box', '#14140f', [0, body + 0.2, 0.18], [0.24, 0.26, 0.08])
  } else {
    primitive(e, 'sphere', f.hair, [0, body + 0.32, -0.04], [0.34, 0.2, 0.34])
  }
  e.setLocalPosition(f.at.x, 0, f.at.z)
  e.setLocalEulerAngles(0, (f.facing * 180) / Math.PI, 0)
  root.addChild(e)
  return e
}

const applyLighting = (app: pc.Application, camera: pc.Entity, sun: pc.Entity, lamp: pc.Entity, l: Lighting): void => {
  if (camera.camera) camera.camera.clearColor = color(l.sky)
  app.scene.ambientLight = color(l.ambient)
  app.scene.fog.type = pc.FOG_LINEAR
  app.scene.fog.color = color(l.fog)
  app.scene.fog.start = l.fogStart
  app.scene.fog.end = l.fogEnd
  if (sun.light) {
    sun.light.color = color(l.sun)
    sun.light.intensity = l.sunIntensity
  }
  sun.setLocalEulerAngles(90 + l.sunPitch, l.sunYaw, 0)
  lamp.enabled = l.lamp !== undefined
  if (l.lamp && lamp.light) {
    lamp.light.color = color(l.lamp.color)
    lamp.light.intensity = l.lamp.intensity
    lamp.light.range = l.lamp.range
    lamp.setLocalPosition(l.lamp.at[0], l.lamp.at[1], l.lamp.at[2])
  }
}

const cameraOffset: Readonly<Record<Space['id'], readonly [number, number]>> = {
  bar: [6.5, 9],
  room: [4.6, 7],
}

type Built = Readonly<{
  id: Space['id']
  root: pc.Entity
  figures: ReadonlyMap<string, pc.Entity>
  rain: readonly pc.Entity[]
  weather: string
}>

export const createView = (canvas: HTMLCanvasElement): View => {
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    keyboard: new pc.Keyboard(window),
  })
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
  app.setCanvasResolution(pc.RESOLUTION_AUTO)
  window.addEventListener('resize', () => app.resizeCanvas())

  const camera = new pc.Entity('camera')
  camera.addComponent('camera', { fov: 45, nearClip: 0.1, farClip: 200 })
  app.root.addChild(camera)

  const sun = new pc.Entity('sun')
  sun.addComponent('light', {
    type: 'directional',
    castShadows: true,
    shadowDistance: 40,
    shadowResolution: 2048,
    shadowBias: 0.3,
    normalOffsetBias: 0.05,
  })
  app.root.addChild(sun)

  const lamp = new pc.Entity('lamp')
  lamp.addComponent('light', { type: 'omni', castShadows: false })
  app.root.addChild(lamp)

  const owen = new pc.Entity('owen')
  addFigure(owen, { id: 'owen-body', at: { x: 0, z: 0 }, facing: 0, coat: '#556b3f', height: 1.8, ...owenLook })
  primitive(owen, 'box', '#c9b98f', [0.3, 0.9, 0.12], [0.12, 0.3, 0.22])
  app.root.addChild(owen)

  const build = (g: Game): Built => {
    const space = spaces[g.space]
    const root = new pc.Entity(space.id)
    primitive(root, 'box', space.ground, [0, -0.05, 0], [space.size.w + 40, 0.1, space.size.d + 40], { shadows: false })
    space.props.forEach((p) => addProp(root, p))
    const figures = new Map(space.figures.map((f) => [f.id, addFigure(root, f)] as const))
    const l = lighting(space.id, space.season, weather(g.story))
    const rain = l.rain
      ? Array.from({ length: 220 }, (_, i) => {
          const r = primitive(root, 'box', '#c8d0da', [((i * 7.31) % 24) - 12, (i * 3.7) % 9, ((i * 5.17) % 18) - 9], [0.02, 0.5, 0.02], {
            shadows: false,
          })
          return r
        })
      : []
    applyLighting(app, camera, sun, lamp, l)
    app.root.addChild(root)
    return { id: space.id, root, figures, rain, weather: weather(g.story) }
  }

  const state: { built?: Built; cam?: pc.Vec3; look?: Readonly<{ x: number; z: number }> } = {}

  const sync = (g: Game, dt: number): void => {
    if (!state.built || state.built.id !== g.space || state.built.weather !== weather(g.story)) {
      state.built?.root.destroy()
      state.built = build(g)
      state.cam = undefined
      state.look = undefined
    }
    const b = state.built
    owen.setLocalPosition(g.pos.x, 0, g.pos.z)
    owen.setLocalEulerAngles(0, (g.facing * 180) / Math.PI, 0)

    b.rain.forEach((r) => {
      const p = r.getLocalPosition()
      const y = p.y - dt * 11
      r.setLocalPosition(p.x, y < 0 ? 9 : y, p.z)
    })
    const [back, up] = cameraOffset[g.space]
    const look = { x: g.pos.x, z: g.pos.z }
    const target = new pc.Vec3(look.x, up, look.z + back)
    const cam = state.cam ?? target.clone()
    cam.lerp(cam, target, Math.min(1, dt * 4))
    state.cam = cam
    camera.setPosition(cam)
    const at = state.look ?? look
    const eased = { x: at.x + (look.x - at.x) * Math.min(1, dt * 4), z: at.z + (look.z - at.z) * Math.min(1, dt * 4) }
    state.look = eased
    camera.lookAt(eased.x, 0.9, eased.z)
  }

  const groundAt = (x: number, y: number): Readonly<{ x: number; z: number }> | undefined => {
    const cam = camera.camera
    if (!cam) return undefined
    const near = cam.screenToWorld(x, y, cam.nearClip)
    const far = cam.screenToWorld(x, y, cam.farClip)
    const dy = far.y - near.y
    if (Math.abs(dy) < 1e-6) return undefined
    const k = -near.y / dy
    return k < 0 ? undefined : { x: near.x + (far.x - near.x) * k, z: near.z + (far.z - near.z) * k }
  }

  app.start()
  return { app, camera, sync, groundAt }
}

import * as pc from 'playcanvas'
import { weather } from '../../text-game/src/story.ts'
import type { Figure, Prop, Space } from './levels.ts'
import { CURLY_HALF_ANGLE, CURLY_RANGE, centerOf, spaces } from './levels.ts'
import type { Pose } from './camera.ts'
import { FOV, NEAR } from './camera.ts'
import type { Lighting } from './lighting.ts'
import type { Cast } from './characters.ts'
import { loadCast } from './characters.ts'
import { castFor, clipFor, playbackRate } from './cast.ts'
import { lighting } from './lighting.ts'
import type { Game } from './prologue.ts'
import { owenMotion, seen, watcher } from './prologue.ts'

const FAR_CLIP = 200

export type Shot = Readonly<{ eye: readonly [number, number, number]; at: readonly [number, number, number] }>

// The camera is written only by sync and pose. A held shot wins over the follow camera until pose(undefined).
export type View = Readonly<{
  app: pc.Application
  camera: pc.Entity
  sync: (g: Game, dt: number, cam: Pose) => void
  pose: (shot: Shot | undefined) => void
  reset: () => void
  groundAt: (x: number, y: number) => Readonly<{ x: number; z: number }> | undefined
  screenAt: (x: number, y: number, z: number) => Readonly<{ x: number; y: number }> | undefined
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
  primitive(root, p.shape ?? 'box', p.color, [p.box.x, y, p.box.z], [p.box.w, p.h, p.box.d], { glow: p.glow, shadows: !p.glow && !p.flat })
}

const addFigure = (root: pc.Entity, f: Figure, cast: Cast): pc.Entity => {
  const who = castFor(f.id)
  if (who) {
    const c = cast.spawn(who)
    c.setLocalPosition(f.at.x, 0, f.at.z)
    c.setLocalEulerAngles(0, (f.facing * 180) / Math.PI, 0)
    root.addChild(c)
    return c
  }
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

const fan = (device: pc.GraphicsDevice, range: number, half: number, steps = 18): pc.Mesh => {
  const points = Array.from({ length: steps + 1 }, (_, i) => -half + (2 * half * i) / steps)
  const positions = [0, 0.04, 0, ...points.flatMap((a) => [Math.sin(a) * range, 0.04, Math.cos(a) * range])]
  const indices = points.slice(1).flatMap((_, i) => [0, i + 1, i + 2])
  const mesh = new pc.Mesh(device)
  mesh.setPositions(positions)
  mesh.setNormals(Array.from({ length: positions.length / 3 }).flatMap(() => [0, 1, 0]))
  mesh.setIndices(indices)
  mesh.update()
  return mesh
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

// The fog end plus a 20% margin (docs/art/README.md, "Beyond the play area"), never nearer than the blockout's 200 m.
export const farClipFor = (l: Lighting): number => Math.max(FAR_CLIP, l.fogEnd * 1.2)

type Built = Readonly<{
  id: Space['id']
  root: pc.Entity
  figures: ReadonlyMap<string, pc.Entity>
  cone?: pc.Entity
  coneMats?: readonly [pc.StandardMaterial, pc.StandardMaterial]
  rain: readonly pc.Entity[]
  weather: string
}>

export const createView = async (canvas: HTMLCanvasElement, base: string): Promise<View> => {
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    keyboard: new pc.Keyboard(window),
  })
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
  app.setCanvasResolution(pc.RESOLUTION_AUTO)
  window.addEventListener('resize', () => app.resizeCanvas())

  const camera = new pc.Entity('camera')
  camera.addComponent('camera', { fov: FOV, nearClip: NEAR, farClip: FAR_CLIP })
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

  const cast = await loadCast(app, base)
  const owen = cast.spawn('owen')
  app.root.addChild(owen)

  const build = (g: Game): Built => {
    const space = spaces[g.space]
    const root = new pc.Entity(space.id)
    const c = centerOf(space)
    primitive(root, 'box', space.ground, [c.x, -0.05, c.z], [space.size.w + 40, 0.1, space.size.d + 40], { shadows: false })
    space.props.forEach((p) => addProp(root, p))
    const figures = new Map(space.figures.map((f) => [f.id, addFigure(root, f, cast)] as const))
    const cone = space.id === 'camp' ? new pc.Entity('sight') : undefined
    const coneMats = cone
      ? ([material('#ffe9a8', { opacity: 0.28, unlit: true }), material('#ff4a3a', { opacity: 0.45, unlit: true })] as const)
      : undefined
    if (cone && coneMats) {
      cone.addComponent('render', {
        meshInstances: [new pc.MeshInstance(fan(app.graphicsDevice, CURLY_RANGE, CURLY_HALF_ANGLE), coneMats[0])],
        castShadows: false,
      })
      root.addChild(cone)
    }
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
    if (camera.camera) camera.camera.farClip = farClipFor(l)
    app.root.addChild(root)
    return { id: space.id, root, figures, cone, coneMats, rain, weather: weather(g.story) }
  }

  const state: { built?: Built; held?: Shot } = {}

  const isCast = (e: pc.GraphNode | null): boolean => (e ? e.tags.has('cast') || isCast(e.parent) : false)

  const dispose = (b: Built | undefined): void => {
    if (!b) return
    const mats = new Set<pc.Material>(
      (b.root.findComponents('render') as pc.RenderComponent[]).filter((r) => !isCast(r.entity)).flatMap((r) => r.meshInstances.flatMap((mi) => (mi.material ? [mi.material] : []))),
    )
    b.coneMats?.forEach((m) => mats.add(m))
    b.root.destroy()
    mats.forEach((m) => m.destroy())
  }

  const place = (shot: Shot): void => {
    camera.setPosition(shot.eye[0], shot.eye[1], shot.eye[2])
    camera.lookAt(shot.at[0], shot.at[1], shot.at[2])
  }

  const sync = (g: Game, dt: number, cam: Pose): void => {
    if (!state.built || state.built.id !== g.space || state.built.weather !== weather(g.story)) {
      dispose(state.built)
      state.built = build(g)
    }
    const b = state.built
    const motion = owenMotion(g)
    const owenClip = clipFor(motion)
    cast.play(owen, owenClip, playbackRate(owenClip, motion.speed))
    spaces[g.space].figures.forEach((f) => {
      const e = b.figures.get(f.id)
      if (!e || !castFor(f.id)) return
      const near = Math.hypot(f.at.x - g.pos.x, f.at.z - g.pos.z) < 2.6
      cast.play(e, clipFor({ speed: 0, sneaking: false, activity: f.activity ?? 'stand', talking: g.panel !== undefined && near }), 1)
    })
    owen.setLocalPosition(g.pos.x, 0, g.pos.z)
    owen.setLocalEulerAngles(0, (g.facing * 180) / Math.PI, 0)
    owen.enabled = spaces[g.space].act !== undefined && (!cam.close || state.held !== undefined)
    if (b.cone && b.coneMats) {
      const w = watcher(g)
      b.cone.setLocalPosition(w.at.x, 0, w.at.z)
      b.cone.setLocalEulerAngles(0, (w.facing * 180) / Math.PI, 0)
      const mi = b.cone.render?.meshInstances[0]
      if (mi) mi.material = seen(g) ? b.coneMats[1] : b.coneMats[0]
      b.figures.get('curly')?.setLocalEulerAngles(0, (w.facing * 180) / Math.PI, 0)
    }
    b.rain.forEach((r) => {
      const p = r.getLocalPosition()
      const y = p.y - dt * 11
      r.setLocalPosition(p.x, y < 0 ? 9 : y, p.z)
    })
    if (state.held) {
      place(state.held)
      return
    }
    camera.setPosition(cam.eye[0], cam.eye[1], cam.eye[2])
    camera.lookAt(cam.target[0], cam.target[1], cam.target[2])
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

  const screenAt = (x: number, y: number, z: number): Readonly<{ x: number; y: number }> | undefined => {
    const c = camera.camera
    if (!c) return undefined
    const p = new pc.Vec3(x, y, z)
    const ahead = p.clone().sub(camera.getPosition()).dot(camera.forward) > 0
    if (!ahead) return undefined
    const s = c.worldToScreen(p)
    return { x: s.x, y: s.y }
  }

  const pose = (shot: Shot | undefined): void => {
    state.held = shot
    if (shot) place(shot)
  }

  const reset = (): void => {
    dispose(state.built)
    state.built = undefined
  }

  app.start()
  return { app, camera, sync, pose, reset, groundAt, screenAt }
}

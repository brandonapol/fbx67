import * as pc from 'playcanvas'
import { weather } from '../../text-game/src/story.ts'
import type { Clock } from '../../text-game/src/types.ts'
import type { Figure, Prop, Space } from './levels.ts'
import { CURLY_HALF_ANGLE, CURLY_RANGE, centerOf, present, propsIn, spaces } from './levels.ts'
import { stageOf } from './freezeup.ts'
import type { Pose } from './camera.ts'
import { FOV, NEAR } from './camera.ts'
import type { Lighting, Time } from './lighting.ts'
import type { Cast } from './characters.ts'
import { loadCast } from './characters.ts'
import type { CastId } from './cast.ts'
import { castFor, clipFor, playbackRate } from './cast.ts'
import { grades, lighting, skyColor, sunDirection, timeAt, timeOf } from './lighting.ts'
import type { Game } from './prologue.ts'
import { footY, inWorld, playerBody, playerMotion, seen, shows, watcher } from './prologue.ts'
import { boatIn } from './cabinRide.ts'
import { closeUp } from './knot.ts'
import type { Debris } from './hazards.ts'
import { DEBRIS, afloat, debrisAt } from './hazards.ts'
import { WATER_Y } from './highwater.ts'

const FAR_CLIP = 200

// clock, on a probe capture only, shows the space at another hour of the story: its season is the story's for that
// date (timeAt in lighting.ts), so one shot can show the same town in July, the flood and freeze-up.
export type Shot = Readonly<{ eye: readonly [number, number, number]; at: readonly [number, number, number]; clock?: Clock }>

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

// A piece of debris, drawn about its own center so it can be moved along its lane each frame.
const floating = (root: pc.Entity, d: Debris): pc.Entity => {
  const e = new pc.Entity(d.id)
  addProp(e, { box: { x: 0, z: 0, w: d.w, d: d.d }, h: d.h, y: -d.h / 2, color: d.color, shape: d.shape })
  root.addChild(e)
  return e
}

const addProp = (root: pc.Entity, p: Prop): pc.Entity | undefined => {
  if (p.h < 0.02) return undefined
  const y = (p.y ?? 0) + p.h / 2
  return primitive(root, p.shape ?? 'box', p.color, [p.box.x, y, p.box.z], [p.box.w, p.h, p.box.d], { glow: p.glow, shadows: !p.glow && !p.flat })
}

const addFigure = (root: pc.Entity, f: Figure, cast: Cast): pc.Entity => {
  const who = castFor(f.cast ?? f.id)
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

// The sky cubemap's face size: big enough that the sun's halo is a smooth gradient, small enough to build per space.
const SKY_FACE = 128

// Face directions in the WebGL cubemap order (+x, -x, +y, -y, +z, -z), for u and v in -1..1 (v down the face).
const faceDir = [
  (u: number, v: number) => [1, -v, -u],
  (u: number, v: number) => [-1, -v, u],
  (u: number, v: number) => [u, 1, v],
  (u: number, v: number) => [u, -1, -v],
  (u: number, v: number) => [u, -v, 1],
  (u: number, v: number) => [-u, -v, -1],
] as const

const skyCubemap = (device: pc.GraphicsDevice, l: Lighting): pc.Texture => {
  const n = SKY_FACE
  const levels = faceDir.map((dir) => {
    const px = new Uint8Array(n * n * 4)
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const d = dir(((x + 0.5) / n) * 2 - 1, ((y + 0.5) / n) * 2 - 1)
        const len = Math.hypot(d[0], d[1], d[2])
        const c = skyColor(l, [d[0] / len, d[1] / len, d[2] / len])
        const i = (y * n + x) * 4
        px[i] = Math.round(c[0] * 255)
        px[i + 1] = Math.round(c[1] * 255)
        px[i + 2] = Math.round(c[2] * 255)
        px[i + 3] = 255
      }
    }
    return px
  })
  return new pc.Texture(device, {
    name: 'sky',
    cubemap: true,
    width: n,
    height: n,
    format: pc.PIXELFORMAT_SRGBA8,
    mipmaps: false,
    minFilter: pc.FILTER_LINEAR,
    magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    levels: [levels],
  })
}

// Point the light's -Y (its direction of travel) away from the sun.
const aimSun = (sun: pc.Entity, l: Lighting): void => {
  const d = sunDirection(l)
  const axis = new pc.Vec3(d[2], 0, -d[0])
  const q = new pc.Quat()
  if (axis.length() > 1e-6) q.setFromAxisAngle(axis.normalize(), (Math.acos(Math.min(1, d[1])) * 180) / Math.PI)
  sun.setRotation(q)
}

// Outdoors the sun gets three cascades over the shadow distance, at 2048 px each (a 4096 px atlas); indoors one.
const shadowsFor = (outdoor: boolean, l: Lighting) => ({
  castShadows: l.sunUp,
  numCascades: outdoor ? 3 : 1,
  shadowResolution: outdoor ? 4096 : 2048,
  shadowDistance: outdoor ? 90 : 40,
})

const applyGrade = (frame: pc.CameraFrame, l: Lighting): void => {
  const g = grades[l.grade]
  frame.grading.enabled = true
  frame.grading.brightness = g.brightness
  frame.grading.contrast = g.contrast
  frame.grading.saturation = g.saturation
  frame.grading.tint = color(g.tint)
  frame.vignette.intensity = g.vignette
  frame.vignette.inner = 0.55
  frame.vignette.outer = 1.3
  frame.vignette.curvature = 0.6
  frame.update()
}

const applyLighting = (app: pc.Application, sun: pc.Entity, lamp: pc.Entity, frame: pc.CameraFrame, l: Lighting, outdoor: boolean): void => {
  const old = app.scene.skybox
  app.scene.skybox = skyCubemap(app.graphicsDevice, l)
  old?.destroy()
  app.scene.ambientLight = color(l.ambient)
  app.scene.fog.type = pc.FOG_LINEAR
  app.scene.fog.color = color(l.fog)
  app.scene.fog.start = l.fogStart
  app.scene.fog.end = l.fogEnd
  if (sun.light) {
    sun.light.color = color(l.sun)
    sun.light.intensity = l.sunIntensity
    Object.assign(sun.light, shadowsFor(outdoor, l))
  }
  aimSun(sun, l)
  lamp.enabled = l.lamp !== undefined
  if (l.lamp && lamp.light) {
    lamp.light.color = color(l.lamp.color)
    lamp.light.intensity = l.lamp.intensity
    lamp.light.range = l.lamp.range
    lamp.setLocalPosition(l.lamp.at[0], l.lamp.at[1], l.lamp.at[2])
  }
  applyGrade(frame, l)
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
  // The rain falls in a box that goes where the player goes, so it is overhead anywhere in a town-sized space.
  rainRoot: pc.Entity
  // The skiff in the flood, which carries the hooded man and, once he climbs in, Owen; Eli's riverboat to the cabin.
  boat?: pc.Entity
  // What comes down the flooded town's streets on the water (hazards.ts).
  debris: readonly (readonly [pc.Entity, Debris])[]
  weather: string
  time: Time
  toggles: readonly (readonly [pc.Entity, Prop['while']])[]
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

  // HDR scene, ACES tonemapping, a little bloom on emissives and the sun, then the grade and vignette per band.
  const frame = new pc.CameraFrame(app, camera.camera as pc.CameraComponent)
  frame.rendering.toneMapping = pc.TONEMAP_ACES
  frame.bloom.intensity = 0.015
  frame.bloom.blurLevel = 12

  const sun = new pc.Entity('sun')
  sun.addComponent('light', {
    type: 'directional',
    castShadows: true,
    shadowType: pc.SHADOW_PCF5_32F,
    cascadeDistribution: 0.6,
    shadowBias: 0.3,
    normalOffsetBias: 0.05,
  })
  app.root.addChild(sun)

  const lamp = new pc.Entity('lamp')
  lamp.addComponent('light', { type: 'omni', castShadows: false })
  app.root.addChild(lamp)

  const cast = await loadCast(app, base)
  // One entity per cast member the player has been; only the story's pov is in the world.
  const players = new Map<CastId, pc.Entity>()
  const playerFor = (who: CastId | undefined): pc.Entity | undefined => {
    players.forEach((e, id) => {
      if (id !== who) e.enabled = false
    })
    if (!who) return undefined
    const had = players.get(who)
    if (had) return had
    const e = cast.spawn(who)
    app.root.addChild(e)
    players.set(who, e)
    return e
  }

  const light = (l: Lighting, space: Space): void => {
    applyLighting(app, sun, lamp, frame, l, !space.interior)
    if (camera.camera) camera.camera.farClip = farClipFor(l)
  }

  const build = (g: Game, t: Time): Built => {
    const space = spaces[g.space]
    const root = new pc.Entity(space.id)
    const c = centerOf(space)
    primitive(root, 'box', space.ground, [c.x, -0.05, c.z], [space.size.w + 40, 0.1, space.size.d + 40], { shadows: false })
    const toggles = propsIn(space, t.season, t.clock).flatMap((p) => {
      const e = addProp(root, p)
      return e && p.while ? [[e, p.while] as const] : []
    })
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
    const boat = space.id === 'flood' || space.id === 'cabin' ? new pc.Entity('boat') : undefined
    if (boat) {
      boatIn(space.id).hull.forEach((p) => addProp(boat, p))
      root.addChild(boat)
    }
    const debris = space.id === 'line' ? DEBRIS.map((d) => [floating(root, d), d] as const) : []
    const l = lighting(space.id, t.season, weather(g.story), t.clock)
    const rainRoot = new pc.Entity('rain')
    root.addChild(rainRoot)
    const rain = l.rain
      ? Array.from({ length: 220 }, (_, i) => {
          const r = primitive(rainRoot, 'box', '#c8d0da', [((i * 7.31) % 24) - 12, (i * 3.7) % 9, ((i * 5.17) % 18) - 9], [0.02, 0.5, 0.02], {
            shadows: false,
          })
          return r
        })
      : []
    light(l, space)
    app.root.addChild(root)
    return { id: space.id, root, figures, cone, coneMats, rain, rainRoot, boat, debris, weather: weather(g.story), time: t, toggles }
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
    const space = spaces[g.space]
    const here = state.built?.id === g.space ? state.built : undefined
    const t = state.held?.clock ? timeAt(state.held.clock) : timeOf(space, g.story, g.path)
    // A new season, or a new freeze-up stage (ice, then snow, then the river skimming over), rebuilds the space.
    const rebuild =
      !here ||
      here.weather !== weather(g.story) ||
      here.time.season !== t.season ||
      stageOf(here.time.season, here.time.clock) !== stageOf(t.season, t.clock)
    if (rebuild) dispose(state.built)
    // The light snaps to the story's clock at each scene; the space itself stays as it is.
    if (!rebuild && here.time.clock !== t.clock) light(lighting(space.id, t.season, weather(g.story), t.clock), space)
    const b: Built = rebuild ? build(g, t) : { ...here, time: t }
    state.built = b
    const player = playerFor(playerBody(g).cast)
    const motion = playerMotion(g)
    const clip = clipFor(motion)
    if (player) cast.play(player, clip, playbackRate(clip, motion.speed))
    spaces[g.space].figures.forEach((f) => {
      const e = b.figures.get(f.id)
      if (!e) return
      e.enabled = present(f, g.story, g.path)
      if (!castFor(f.cast ?? f.id)) return
      const near = Math.hypot(f.at.x - g.pos.x, f.at.z - g.pos.z) < 2.6
      cast.play(e, clipFor({ speed: 0, sneaking: false, activity: f.activity ?? 'stand', talking: g.panel !== undefined && near }), 1)
    })
    if (b.boat) {
      const craft = boatIn(g.space)
      const r = craft.course.at(g.ride ?? 0)
      b.boat.setLocalPosition(r.hull.x, 0, r.hull.z)
      b.boat.setLocalEulerAngles(0, (r.heading * 180) / Math.PI, 0)
      const man = b.figures.get(craft.man)
      man?.setLocalPosition(r.bow.x, craft.deck, r.bow.z)
      man?.setLocalEulerAngles(0, (r.heading * 180) / Math.PI, 0)
    }
    b.debris.forEach(([e, d]) => {
      const at = debrisAt(d, g.t)
      e.setLocalPosition(at.x, WATER_Y - d.h * 0.1 - (1 - afloat(d, g.t)) * (d.h + 0.1), at.z)
    })
    b.rainRoot.setLocalPosition(g.pos.x, 0, g.pos.z)
    if (player) {
      player.setLocalPosition(g.pos.x, footY(g), g.pos.z)
      player.setLocalEulerAngles(0, (g.facing * 180) / Math.PI, 0)
      player.enabled = inWorld(g) && (!cam.close || state.held !== undefined)
    }
    if (b.cone && b.coneMats) {
      const w = watcher(g)
      b.cone.setLocalPosition(w.at.x, 0, w.at.z)
      b.cone.setLocalEulerAngles(0, (w.facing * 180) / Math.PI, 0)
      const mi = b.cone.render?.meshInstances[0]
      if (mi) mi.material = seen(g) ? b.coneMats[1] : b.coneMats[0]
      b.figures.get('curly')?.setLocalEulerAngles(0, (w.facing * 180) / Math.PI, 0)
    }
    b.toggles.forEach(([e, w]) => {
      e.enabled = shows(g, w)
    })
    b.rain.forEach((r) => {
      const p = r.getLocalPosition()
      const y = p.y - dt * 11
      r.setLocalPosition(p.x, y < 0 ? 9 : y, p.z)
    })
    // A held shot wins; then a close-up Wade is leaning in for (the knot at the cabin); then the follow camera.
    const shot = state.held ?? closeUp(g.look, g.space)
    if (shot) {
      place(shot)
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

import * as pc from 'playcanvas'
import { weather } from '../../text-game/src/story.ts'
import type { Clock } from '../../text-game/src/types.ts'
import type { Figure, Prop, Space } from './levels.ts'
import { centerOf, present, propsIn, spaces } from './levels.ts'
import { stageOf } from './freezeup.ts'
import type { Pose } from './camera.ts'
import { FOV, NEAR } from './camera.ts'
import type { Lighting, Time } from './lighting.ts'
import type { Cast } from './characters.ts'
import { loadCast } from './characters.ts'
import type { CastId } from './cast.ts'
import { clipFor, playbackRate } from './cast.ts'
import { grades, lighting, skyColor, sunDirection, timeAt, timeOf } from './lighting.ts'
import type { Game } from './prologue.ts'
import { footY, hiding, inWorld, playerBody, playerMotion, shows } from './prologue.ts'
import { OFFICER, placed } from './barfight.ts'
import type { CampView } from './campView.ts'
import { buildCamp } from './campView.ts'
import { buildSlope } from './skiView.ts'
import { boatIn } from './cabinRide.ts'
import { CRUISER_HULL, LIGHT_BAR, TRUCK_HULL, barnetteAt, cruiserAt, lightColor, truckAt } from './roadsideStop.ts'
import { closeUp } from './knot.ts'
import { tieShot } from './bushStrip.ts'
import type { Debris } from './hazards.ts'
import { DEBRIS, afloat, debrisAt } from './hazards.ts'
import { WATER_Y } from './highwater.ts'
import { flightLight, flying, litGold, planeAt, planeHull, restingIn } from './flight.ts'
import { curlyAt } from './floatDock.ts'
import type { CrowdView } from './crowdView.ts'
import { crowdFor, syncCrowd } from './crowdView.ts'
import { figuresOf, walkers } from './photoLab.ts'
import { poseAt as dutyPose } from './majorsCabinet.ts'

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
  // The accessibility option that keeps Curly's sight cone on the ground at the survey camp (frontEnd.ts, Prefs).
  cone: (on: boolean) => void
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
  if (p.h < 0.02 || p.unseen) return undefined
  const y = (p.y ?? 0) + p.h / 2
  return primitive(root, p.shape ?? 'box', p.color, [p.box.x, y, p.box.z], [p.box.w, p.h, p.box.d], { glow: p.glow, shadows: !p.glow && !p.flat })
}

// The lab's people in Air Force blue, the duty sergeant's darker under his parka.
const UNIFORM: Readonly<Record<string, string>> = { clerk: '#4a5a78', airman: '#56688a', sergeant: '#2f3a4e', duty: '#56688a' }

const addFigure = (root: pc.Entity, f: Figure, cast: Cast): pc.Entity => {
  if (f.cast !== undefined) {
    const c = cast.spawn(f.cast)
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
  frame.grading.brightness = g.brightness * (l.exposure ?? 1)
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
  // The sky's fill is exposed down less than the sun (to the power 0.37): under a high sun the open sky
  // lights the shade more, and shade under spruce is not black.
  const fill = color(l.ambient)
  const lift = (l.exposure ?? 1) ** -0.63
  app.scene.ambientLight = new pc.Color(fill.r * lift, fill.g * lift, fill.b * lift)
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
  // The survey camp's terrain, plants, structures and Curly at work (campView.ts).
  camp?: CampView
  rain: readonly pc.Entity[]
  // The rain falls in a box that goes where the player goes, so it is overhead anywhere in a town-sized space.
  rainRoot: pc.Entity
  // The skiff in the flood, which carries the hooded man and, once he climbs in, Owen; Eli's riverboat to the cabin.
  boat?: pc.Entity
  // Curly's floatplane: moored at the float downtown, and on the flight north over town and down at the camp.
  plane?: pc.Entity
  // Barnette's roadside stop on the highway: the borrowed truck, the cruiser and its two lamps (roadsideStop.ts).
  roadside?: Readonly<{ truck: pc.Entity; cruiser: pc.Entity; red: pc.Entity; blue: pc.Entity }>
  // Whether it is lit by the flight's gold over town (flight.ts, flightLight).
  gold: boolean
  // What comes down the flooded town's streets on the water (hazards.ts).
  debris: readonly (readonly [pc.Entity, Debris])[]
  weather: string
  time: Time
  toggles: readonly (readonly [pc.Entity, Prop['while']])[]
  // The photo lab's people on the base, drawn where their rounds have them while the run is on (photoLab.ts).
  labMen: ReadonlyMap<string, pc.Entity>
}>

// The roadside stop's vehicles, each in its own frame like the boats (boat.ts), placed every frame by sync.
const buildRoadside = (root: pc.Entity) => {
  const vehicle = (name: string, hull: readonly Prop[]) => {
    const e = new pc.Entity(name)
    hull.forEach((p) => addProp(e, p))
    root.addChild(e)
    return e
  }
  const truck = vehicle('truck', TRUCK_HULL)
  const cruiser = vehicle('cruiser', CRUISER_HULL)
  const lamp = (p: Prop) => {
    const e = new pc.Entity('lamp')
    addProp(e, p)
    cruiser.addChild(e)
    return e
  }
  return { truck, cruiser, red: lamp(LIGHT_BAR.red), blue: lamp(LIGHT_BAR.blue) }
}

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
    // The camp draws its own ground (campView.ts); the search's is the slope's own shape (skiView.ts).
    if (space.id === 'search') buildSlope(app, root)
    else if (space.id !== 'camp') primitive(root, 'box', space.ground, [c.x, -0.05, c.z], [space.size.w + 40, 0.1, space.size.d + 40], { shadows: false })
    const toggles = propsIn(space, t.season, t.clock).flatMap((p) => {
      const e = addProp(root, p)
      return e && p.while ? [[e, p.while] as const] : []
    })
    const figures = new Map(space.figures.map((f) => [f.id, addFigure(root, f, cast)] as const))
    const labMen = new Map(
      space.id === 'eielson' ? [...walkers.map((w) => w.id), 'duty'].map((id) => [id, addFigure(root, { id: `lab-${id}`, at: { x: 0, z: 0 }, facing: 0, coat: UNIFORM[id], skin: '#c99b7a', hair: '#3a2c22', height: 1.78 }, cast)] as const) : [],
    )
    const camp = space.id === 'camp' ? buildCamp(app, root, base) : undefined
    const boat = space.id === 'flood' || space.id === 'cabin' ? new pc.Entity('boat') : undefined
    if (boat) {
      boatIn(space.id).hull.forEach((p) => addProp(boat, p))
      root.addChild(boat)
    }
    const plane = space.id === 'downtown' || space.id === 'camp' ? new pc.Entity('plane') : undefined
    if (plane) {
      planeHull.forEach((p) => addProp(plane, p))
      root.addChild(plane)
    }
    const roadside = space.id === 'highway' ? buildRoadside(root) : undefined
    const debris = space.id === 'line' ? DEBRIS.map((d) => [floating(root, d), d] as const) : []
    const l = flightLight(lighting(space.id, t.season, weather(g.story), t.clock), g.flight)
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
    return { id: space.id, root, figures, camp, rain, rainRoot, boat, plane, roadside, debris, weather: weather(g.story), time: t, gold: litGold(g.flight), toggles, labMen }
  }

  const state: { built?: Built; held?: Shot; crowd?: CrowdView; cone: boolean } = { cone: false }

  const isCast = (e: pc.GraphNode | null): boolean => (e ? e.tags.has('cast') || isCast(e.parent) : false)

  const dispose = (b: Built | undefined): void => {
    if (!b) return
    const mats = new Set<pc.Material>(
      (b.root.findComponents('render') as pc.RenderComponent[]).filter((r) => !isCast(r.entity)).flatMap((r) => r.meshInstances.flatMap((mi) => (mi.material ? [mi.material] : []))),
    )
    b.camp?.dispose()
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
    // The light snaps to the story's clock at each scene, and to the flight's gold over town; the space stays as it is.
    const gold = litGold(g.flight)
    if (!rebuild && (here.time.clock !== t.clock || here.gold !== gold))
      light(flightLight(lighting(space.id, t.season, weather(g.story), t.clock), g.flight), space)
    const b: Built = rebuild ? build(g, t) : { ...here, time: t, gold }
    state.built = b
    const player = playerFor(playerBody(g).cast)
    const motion = playerMotion(g)
    // Hiding the notes at the camp, Owen kneels, climbs or digs (camp.ts, hidePose).
    const hid = hiding(g)
    const clip = hid?.clip ?? clipFor(motion)
    if (player) cast.play(player, clip, hid ? 1 : playbackRate(clip, motion.speed))
    // Curly in the left seat, or on his walkaround at the float (floatDock.ts): drawn there, with that one clip.
    const drawn = curlyAt(g)
    spaces[g.space].figures.forEach((f) => {
      const e = b.figures.get(f.id)
      if (!e) return
      e.enabled = present(f, g.story, g.path) || (f.id === 'curly' && flying(g.flight))
      // In the barfight a man stands where the fight has him, laid out while he is down (barfight.ts); the officer is
      // in the door once the law is in.
      const fx = g.brawl && placed(g.brawl, f.id)
      if (g.brawl && f.id === OFFICER) e.enabled = fx !== undefined
      if (fx) {
        e.setLocalPosition(fx.at.x, 0, fx.at.z)
        e.setLocalEulerAngles(fx.down ? -80 : 0, (fx.facing * 180) / Math.PI, 0)
        const c = clipFor({ speed: fx.speed, sneaking: false, activity: fx.seated ? 'sit' : 'stand', talking: false })
        if (f.cast !== undefined) cast.play(e, c, playbackRate(c, fx.speed))
        return
      }
      if (f.cast === undefined) return
      if (f.id === 'curly' && drawn) {
        const c = clipFor(drawn.motion)
        e.setLocalPosition(drawn.at.x, drawn.y, drawn.at.z)
        e.setLocalEulerAngles(0, (drawn.heading * 180) / Math.PI, 0)
        cast.play(e, c, playbackRate(c, drawn.motion.speed))
        return
      }
      const near = Math.hypot(f.at.x - g.pos.x, f.at.z - g.pos.z) < 2.6
      cast.play(e, clipFor({ speed: 0, sneaking: false, activity: f.activity ?? 'stand', talking: g.panel !== undefined && near }), 1)
    })
    // The town's people, in the bar and on the street (crowdView.ts): the same the schedule places for talk and asking
    // the way (townsfolk.ts).
    state.crowd = crowdFor(state.crowd, b.root, g, primitive)
    // The schedule is the story clock's: a probe shot at another hour shows the space without this hour's people.
    state.crowd.root.enabled = !state.held?.clock
    syncCrowd(state.crowd, g, dt)
    if (b.boat) {
      const craft = boatIn(g.space)
      const r = craft.course.at(g.ride ?? 0)
      b.boat.setLocalPosition(r.hull.x, 0, r.hull.z)
      b.boat.setLocalEulerAngles(0, (r.heading * 180) / Math.PI, 0)
      const man = b.figures.get(craft.man)
      man?.setLocalPosition(r.bow.x, craft.deck, r.bow.z)
      man?.setLocalEulerAngles(0, (r.heading * 180) / Math.PI, 0)
    }
    if (b.roadside) {
      // The stage plays from the story's own gates: the cruiser only where Barnette stops Wade, and he only on foot
      // from the search on (roadsideStop.ts). Seconds into the stage; before it starts, its first frame.
      const r = b.roadside
      const at = g.stop ?? 0
      const put = (e: pc.Entity, p: { at: { x: number; z: number }; heading: number }) => {
        e.setLocalPosition(p.at.x, 0, p.at.z)
        e.setLocalEulerAngles(0, (p.heading * 180) / Math.PI, 0)
      }
      put(r.truck, truckAt(g.story, at))
      const car = cruiserAt(g.story, at)
      r.cruiser.enabled = car !== undefined
      if (car) put(r.cruiser, car)
      const lamp = lightColor(g.story, at)
      r.red.enabled = lamp === 'red'
      r.blue.enabled = lamp === 'blue'
      const man = b.figures.get('barnette')
      const on = barnetteAt(g.story, at)
      if (man) {
        man.enabled = on !== undefined
        if (on) put(man, on)
      }
    }
    if (b.plane) {
      // At the camp the plane is drawn only while it comes in; parked, the camp's own plane stands there.
      const air = flying(g.flight)
      const p = air ? planeAt(g.flight) : restingIn(g.space === 'camp' ? 'camp' : 'downtown')
      b.plane.enabled = air || g.space === 'downtown' || (g.space === 'camp' && shows(g, 'parked'))
      b.plane.setLocalPosition(p.at.x, p.y, p.at.z)
      b.plane.setLocalEulerAngles(0, (p.heading * 180) / Math.PI, 0)
      // Stopped to talk, Curly is back where his figure stands.
      const curly = b.figures.get('curly')
      const f = spaces[g.space].figures.find((x) => x.id === 'curly')
      if (curly && f && !drawn) {
        curly.setLocalPosition(f.at.x, 0, f.at.z)
        curly.setLocalEulerAngles(0, (f.facing * 180) / Math.PI, 0)
      }
    }
    b.debris.forEach(([e, d]) => {
      const at = debrisAt(d, g.t)
      e.setLocalPosition(at.x, WATER_Y - d.h * 0.1 - (1 - afloat(d, g.t)) * (d.h + 0.1), at.z)
    })
    b.rainRoot.setLocalPosition(g.pos.x, 0, g.pos.z)
    if (player) {
      const where = hid?.at ?? g.pos
      player.setLocalPosition(where.x, footY(g) + (hid?.lift ?? 0), where.z)
      player.setLocalEulerAngles(0, ((hid?.facing ?? g.facing) * 180) / Math.PI, 0)
      player.enabled = inWorld(g) && (!cam.close || state.held !== undefined)
    }
    b.camp?.sync(g, flying(g.flight) ? undefined : b.figures.get('curly'), cast, state.cone)
    // The duty airman walks his round while the Major's cabinet run is on (majorsCabinet.ts).
    const lab = [...figuresOf(g.lab), ...(g.cabinet ? [{ id: 'duty', pose: dutyPose(g.cabinet.clock) }] : [])]
    b.labMen.forEach((e, id) => {
      const f = lab.find((x) => x.id === id)
      e.enabled = f !== undefined
      if (!f) return
      e.setLocalPosition(f.pose.at.x, 0.3, f.pose.at.z)
      e.setLocalEulerAngles(0, (f.pose.facing * 180) / Math.PI, 0)
    })
    b.toggles.forEach(([e, w]) => {
      e.enabled = shows(g, w)
    })
    b.rain.forEach((r) => {
      const p = r.getLocalPosition()
      const y = p.y - dt * 11
      r.setLocalPosition(p.x, y < 0 ? 9 : y, p.z)
    })
    // A held shot wins; then a close-up Wade is leaning in for (the knot at the cabin); then the follow camera.
    const shot = state.held ?? closeUp(g.look, g.space) ?? tieShot(g.look, g.space)
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
  const cone = (on: boolean): void => {
    state.cone = on
  }

  return { app, camera, sync, pose, reset, groundAt, screenAt, cone }
}

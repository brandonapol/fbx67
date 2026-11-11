import type * as pc from 'playcanvas'
import type { SpaceId } from './levels.ts'
import { spaces } from './levels.ts'
import type { Brawl } from './barfight.ts'
import { WADE_STOOL, begin, play, roomOf, wade } from './barfight.ts'
import { idle } from './combat.ts'
import type { Game } from './prologue.ts'
import type { Shot, View } from './render.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import { KNOT_SHOT } from './knot.ts'
import { OWEN_SEAT, planeAt, seatAt } from './flight.ts'

const FLIGHT_SHOT = 22

// heat, when set, overrides the story's heat for the frame, so one shot can show each moral-weather band; ride, when
// set, holds a boat at that many seconds into its ride, so the frame does not depend on how fast the page ran; flight,
// likewise, holds the plane that many seconds into the flight north (flight.ts); fight puts the barfight on, that many
// seconds after the shove (fightAt), and stands the player where it has Wade, whatever pos says; stop holds the roadside
// stop that many seconds into its stage (roadsideStop.ts).
export type Pose = Readonly<{ space: SpaceId; pos: Vec; facing: number; t: number; shot: Shot; heat?: number; ride?: number; flight?: number; fight?: number; stop?: number }>

// The barfight at its peak (#177): 16 s after the shove every patron has come in (barfight.ts, JOINERS) and none has
// had enough yet, so all ten men in the Pan are in it, Wade on his feet among them.
export const PEAK_FIGHT = 16

const FIGHT_DT = 1 / 30

// The fight that many seconds after Wade got up, played on its own clock with Wade standing idle: the same every time,
// however fast the page ran.
export const fightAt = (seconds: number): Brawl =>
  Array.from({ length: Math.round(seconds / FIGHT_DT) }).reduce<Brawl>(
    (b) => play(b, idle, FIGHT_DT),
    begin('gotUp', roomOf(spaces.pan.props, spaces.pan.figures)),
  )

export const poses: Readonly<Record<string, Pose>> = {
  bar: { space: 'bar', pos: vec(0, 3.9), facing: Math.PI, t: 0, shot: { eye: [0, 9.5, 9.5], at: [0, 0.9, 0] } },
  round: { space: 'bar', pos: vec(-1.5, -2.2), facing: Math.PI, t: 0, shot: { eye: [3.5, 5.5, 4.5], at: [-1.5, 1, -2.6] } },
  // From the hall through the parlor doorway: the landlady by the radio, the boarder, the sofa and the lamp.
  parlor: { space: 'boarding', pos: vec(-0.8, 4.0), facing: -Math.PI / 2, t: 0, shot: { eye: [0.7, 1.9, 3.7], at: [-5.5, 1.0, 3.3] } },
  letter: { space: 'room', pos: vec(0.6, -1.0), facing: Math.PI, t: 0, shot: { eye: [-1.8, 2.4, 2.4], at: [0.8, 1.0, -2.4] } },
  hidden: { space: 'camp', pos: vec(1.8, -7.5), facing: Math.PI, t: 1, shot: { eye: [-2, 4.6, -4.4], at: [1.8, 0.6, -8.4] } },
  // The survey camp's establishing shot, matched against docs/art/targets/survey-camp.webp: from up the bar at eye
  // height, Owen walking in past the cache, the cook tent, Curly at the cans by the floatplane, the creek and the cutbank.
  camp: { space: 'camp', pos: vec(13.2, 2.2), facing: -1.7, t: 1, shot: { eye: [16.2, 1.9, 1.6], at: [-6, 1.3, 5.6] } },
  // Owen at the steps of his flooded boarding house, the skiff waiting and the hooded man's back to the camera, which
  // stands over the east end of the walkway, behind his back (skiff.ts, faceSeen).
  skiff: { space: 'flood', pos: vec(135.2, 98.5), facing: 0, t: 0, shot: { eye: [147, 3.2, 98.8], at: [135.2, 0.9, 100.5] } },
  // The skiff shot at blue hour and at danger (heat at and past HEAT_LIMIT); 'skiff' itself is alpenglow.
  skiff_dusk: { space: 'flood', pos: vec(135.2, 98.5), facing: 0, t: 0, shot: { eye: [147, 3.2, 98.8], at: [135.2, 0.9, 100.5] }, heat: 2 },
  skiff_night: { space: 'flood', pos: vec(135.2, 98.5), facing: 0, t: 0, shot: { eye: [147, 3.2, 98.8], at: [135.2, 0.9, 100.5] }, heat: 4 },
  // Act 1's first frame: Wade on the sandbag line, the woman from Minto at his shoulder, the river past the bags.
  line: { space: 'line', pos: vec(3.4, 66.3), facing: Math.PI, t: 0, shot: { eye: [5.9, 2.6, 71.1], at: [2.7, 1.1, 64.3] } },
  // Act 1's morning in the drunk tank: Wade in the cell, Barnette at the bars, the desk beyond.
  cell: { space: 'jail', pos: vec(-3.6, 1.4), facing: Math.PI / 2, t: 0, shot: { eye: [-4.6, 2.4, 3.6], at: [-0.5, 1.1, -0.5] } },
  // Act 1's night at the help tent: Wade in from the flap, Joan at the tarp on the last cot, Eli at its foot.
  tent: { space: 'helpTent', pos: vec(0, 3.4), facing: Math.PI, t: 0, shot: { eye: [-2.6, 2.5, 3.9], at: [3.2, 0.8, -2.6] } },
  // Act 1's Saturday at the Silver Pan: Wade on his stool for Hank's speech, Eli on the next one, the drunk and his
  // friends behind them, the mud on the boards, from over the room toward the bar.
  pan: { space: 'pan', pos: vec(0.5, -2.35), facing: 0, t: 0, shot: { eye: [3.6, 3.2, 3.4], at: [-0.6, 1.0, -2.2] } },
  // The same Saturday mid-fight, at its peak: all ten in it along the bar and down to the card table, from high over
  // the door, as the prologue's bar is shot, so the whole room is in the frame.
  brawl: { space: 'pan', pos: WADE_STOOL, facing: 0, t: 0, fight: PEAK_FIGHT, shot: { eye: [0, 9, 8.5], at: [-0.2, 0.8, -0.3] } },
  // Act 1's land office: Wade in the water inside the door, Eli by him, Lucy at the foot of the stair with the ledgers.
  office: { space: 'office', pos: vec(0, -4.1), facing: 0, t: 0, shot: { eye: [-2.5, 2.6, -4.6], at: [3.5, 1.2, -1] } },
  downtown: { space: 'downtown', pos: vec(33, 50.5), facing: Math.PI / 2, t: 0, shot: { eye: [26, 4.5, 50.5], at: [70, 3, 53] } },
  // The same street from the same data on a flood day and late in freeze-up (snow down, cars plugged in, smoke up).
  downtown_flood: { space: 'downtown', pos: vec(33, 50.5), facing: Math.PI / 2, t: 0, shot: { eye: [26, 4.5, 50.5], at: [70, 3, 53], clock: '1967-08-15T12:00' } },
  downtown_freezeup: { space: 'downtown', pos: vec(33, 50.5), facing: Math.PI / 2, t: 0, shot: { eye: [26, 4.5, 50.5], at: [70, 3, 53], clock: '1967-10-28T12:30' } },
  // A street sign close up: the post on Second's south walk at Cushman, its two blades crossed over the corner, from
  // out on Second Avenue, Owen behind the camera. The names on the blades are the page's type (streetSignsView.ts), hidden with the rest of the HUD.
  sign: { space: 'downtown', pos: vec(14, 53), facing: -Math.PI / 2, t: 0, shot: { eye: [9.2, 2.1, 57.6], at: [5.2, 2.5, 61.2] } },
  // The base blockout: Wade on the gate road at the squadron lot, the squadron building and his dorm beyond.
  // Act 1's evening at the cabin: the ride over, Wade on the thwart, Eli in the bow, the body off to starboard with the
  // yellow line down to the drowned sawhorse, the cabin sunk to its eaves beyond.
  cabin: { space: 'cabin', pos: vec(1.91, -6.25), facing: 2.94, t: 0, ride: 17.1, shot: { eye: [-0.4, 3.2, -2.2], at: [4.1, 0.2, -9.2] } },
  // The knot close-up (knot.ts): Wade leaning over the gunwale at the end of the ride, the bowline's loop round the top
  // of Owen's shirt and the tail outside it; in each moral-weather band, as the skiff is (heat 0, 2 and 4).
  knot: { space: 'cabin', pos: vec(1.91, -6.25), facing: 2.94, t: 0, ride: 17.1, shot: KNOT_SHOT },
  knot_dusk: { space: 'cabin', pos: vec(1.91, -6.25), facing: 2.94, t: 0, ride: 17.1, shot: KNOT_SHOT, heat: 2 },
  knot_night: { space: 'cabin', pos: vec(1.91, -6.25), facing: 2.94, t: 0, ride: 17.1, shot: KNOT_SHOT, heat: 4 },
  base: { space: 'eielson', pos: vec(160, -7), facing: Math.PI, t: 0, shot: { eye: [175, 22, 12], at: [130, 0, -45] } },
  // The flight north in its climbing turn over the west end of town, lit low and gold: from off its left wingtip,
  // looking east past the plane to the town and the low morning sun.
  flight: { space: 'downtown', pos: seatAt(FLIGHT_SHOT, OWEN_SEAT).at, facing: planeAt(FLIGHT_SHOT).heading, t: 0, flight: FLIGHT_SHOT, shot: { eye: [-56, 31, -26], at: [-36, 24, -19] } },
  // Lucy's kitchen: Wade inside the door, Lucy at her table with the photos, the stove in the far corner.
  kitchen: { space: 'kitchen', pos: vec(-1.6, -1.8), facing: 0, t: 0, shot: { eye: [-2.4, 2.1, -2.0], at: [0.8, 0.8, 1.2] } },
  // The hotel bar: Wade in at the door with his guitar, the bar down the left, Tolliver's booth in the far corner.
  hotelBar: { space: 'hotelBar', pos: vec(-4, -4.2), facing: 0, t: 0, shot: { eye: [-4.6, 2.3, -4.6], at: [4.5, 0.9, 3.6] } },
  // The bush strip in November (bushStrip.ts): Wade on the snow, Curly at the tie-down post under the tarped wing.
  strip: { space: 'strip', pos: vec(-5, 6.5), facing: Math.PI / 2, t: 0, shot: { eye: [-7, 2.4, 9], at: [1.5, 1.2, 2] } },
  // The Silver Pan in Act 2: the booth, Curly at it, the counter beyond.
  steak: { space: 'steak', pos: vec(1.6, 0.8), facing: 0, t: 0, shot: { eye: [0, 2.3, 4.2], at: [3.2, 0.8, 0.2] } },
  // Outside the base hangar: Jake in the personnel door he has to duck under.
  hangar: { space: 'hangar', pos: vec(0.2, 1.5), facing: 0, t: 0, shot: { eye: [-2.5, 2.0, 4.5], at: [0.2, 1.3, -2.5] } },
  // Dottie's café: Wade in from the door off Second, the counter and his poured cup ahead, Dottie behind it.
  cafe: { space: 'cafe', pos: vec(-2.5, -2.7), facing: 0, t: 0, shot: { eye: [-3.8, 2.1, -3.0], at: [0.2, 1.0, 2.4] } },
  // The Richardson Highway at the end of the stage: the truck parked at the turnout and, where Barnette stops Wade,
  // the cruiser behind it with its lights going and Barnette at the window; from the road, looking north up it.
  highway: { space: 'highway', pos: vec(4.6, -18.5), facing: Math.PI, t: 0, stop: 30, shot: { eye: [-0.5, 2.4, -4.5], at: [5.4, 1.0, -16] } },
  story: { space: 'story', pos: vec(0, 0), facing: Math.PI, t: 0, shot: { eye: [0, 5, 6], at: [0, 0, 0] } },
}

export const WARMUP_FRAMES = 5

// A moment budgeted on its own row in docs/perf.md, beside its space's: a capture pose held still and sampled, its
// frames counted under the moment's id and not its space's. The Pan at the barfight's peak is the bar at its densest.
export const moments = { panPeak: 'brawl' } as const satisfies Readonly<Record<string, keyof typeof poses>>

export type Moment = keyof typeof moments

export type Sample = Readonly<{
  space: SpaceId | Moment
  drawCalls: number
  triangles: number
  textureBytes: number
  vramBytes: number
  cpuMs: number
  frameMs: number
}>

// camera is the page's camera rig and the space it was placed for, kept whole through a capture so release puts it back:
// a capture taken before a space's first frame would otherwise leave the rig placed behind the pose, not the player.
export type Live = Readonly<{ get: () => Game; set: (g: Game) => void; camera: Readonly<{ get: () => unknown; set: (c: unknown) => void }> }>

export type AnimLayerLike = {
  readonly activeState: string | null
  readonly transitioning: boolean
  activeStateCurrentTime: number
  transition: (to: string, time?: number) => void
  update: (dt: number) => void
}

export type AnimLike = Readonly<{ enabled: boolean; layers: readonly AnimLayerLike[] }>

export const freezeAnims = (anims: readonly AnimLike[]): number => {
  const layers = anims.filter((a) => a.enabled).flatMap((a) => a.layers).filter((l) => l.activeState !== null)
  layers.forEach((l) => {
    if (l.transitioning && l.activeState !== null) l.transition(l.activeState, 0)
    l.activeStateCurrentTime = 0
    l.update(0)
  })
  return layers.length
}

export const posed = (g: Game, p: Pose): Game => {
  if (g.space !== p.space) throw new Error(`pose is for ${p.space}, the game is in ${g.space}`)
  const story = p.heat === undefined ? g.story : { ...g.story, heat: p.heat }
  const held = { ...g, story, pos: p.pos, facing: p.facing, t: p.t, vel: vec(0, 0), holding: undefined, watch: undefined, ...(p.ride === undefined ? {} : { ride: p.ride }), ...(p.flight === undefined ? {} : { flight: p.flight }), ...(p.stop === undefined ? {} : { stop: p.stop }) }
  if (p.fight === undefined) return held
  const brawl = fightAt(p.fight)
  return { ...held, brawl, pos: wade(brawl).pos, facing: wade(brawl).facing }
}

const triangles = (app: pc.AppBase): number =>
  (app.root.findComponents('render') as pc.RenderComponent[])
    .filter((r) => r.enabled && r.entity.enabled)
    .flatMap((r) => r.meshInstances.filter((mi) => mi.visible))
    .reduce((n, mi) => n + Math.floor((mi.mesh?.primitive[0]?.count ?? 0) / 3) * (mi.instancingData ? Math.max(1, mi.instancingCount) : 1), 0)

const hudStyle = 'body[data-capture] > :not(#scene) { visibility: hidden !important; }'

export const installProbe = (view: View, live: Live): void => {
  const app = view.app
  const hold: { saved?: Game; camera?: unknown } = {}
  const rec: {
    on: boolean
    start: number
    age: number
    space?: Sample['space']
    moment?: Moment
    pending?: Pick<Sample, 'space' | 'triangles' | 'cpuMs'>
    samples: Sample[]
  } = { on: false, start: 0, age: 0, samples: [] }

  document.head.append(Object.assign(document.createElement('style'), { textContent: hudStyle }))

  const frames = (n: number): Promise<void> =>
    n <= 0 ? Promise.resolve() : new Promise((done) => app.once('frameend', () => done(frames(n - 1))))

  app.on('frameupdate', () => {
    const p = rec.pending
    if (rec.on && p) {
      rec.samples.push({
        ...p,
        drawCalls: app.stats.drawCallCount,
        textureBytes: app.stats.vramTextureBytes,
        vramBytes: app.stats.vramTotalBytes,
        frameMs: app.stats.frameTime,
      })
    }
    rec.pending = undefined
    rec.start = performance.now()
  })

  app.on('frameend', () => {
    if (!rec.on) return
    const cpuMs = performance.now() - rec.start
    const space = rec.moment ?? live.get().space
    rec.age = space === rec.space ? rec.age + 1 : 0
    rec.space = space
    if (rec.age >= WARMUP_FRAMES) rec.pending = { space, triangles: triangles(app), cpuMs }
  })

  // heat, when given, takes the frame in that moral-weather band whatever the pose says (the Act 1 run's bands).
  const capture = async (name: string, at: string = name, heat?: number): Promise<void> => {
    const found = poses[at]
    if (!found) throw new Error(`no capture pose named ${at}`)
    const pose = heat === undefined ? found : { ...found, heat }
    const saved = hold.saved ?? live.get()
    if (!hold.saved) hold.camera = live.camera.get()
    hold.saved = saved
    live.set(posed(saved, pose))
    app.timeScale = 0
    document.body.dataset.capture = name
    view.pose(pose.shot)
    view.reset()
    await frames(1)
    freezeAnims(app.root.findComponents('anim') as unknown as AnimLike[])
    await frames(2)
  }

  const release = (): Promise<void> => {
    if (hold.saved) live.set(hold.saved)
    if (hold.saved) live.camera.set(hold.camera)
    hold.saved = undefined
    hold.camera = undefined
    view.pose(undefined)
    app.timeScale = 1
    delete document.body.dataset.capture
    view.reset()
    return frames(1)
  }

  // Puts the player at a pose in its space, live, for a space no scene routes to yet (the base blockout), so the smoke
  // test can sample it and capture its frame.
  const visit = (at: string): Promise<void> => {
    const pose = poses[at]
    if (!pose) throw new Error(`no pose named ${at}`)
    live.set({ ...live.get(), space: pose.space, pos: pose.pos, facing: pose.facing, view: pose.facing, panel: undefined, holding: undefined })
    return frames(1)
  }

  const record = (on: boolean): void => {
    rec.on = on
    rec.age = 0
    rec.space = undefined
    rec.moment = undefined
    rec.pending = undefined
  }

  // Holds a moment's pose still and records n frames of it, past the warmup, under the moment's id; then puts the game
  // back and records as before.
  const sampleMoment = async (moment: string, n: number): Promise<void> => {
    if (!(moment in moments)) throw new Error(`no moment named ${moment}`)
    const id = moment as Moment
    const was = rec.on
    await capture(id, moments[id])
    record(true)
    rec.moment = id
    await frames(WARMUP_FRAMES + n + 1)
    record(was)
    await release()
  }

  const w = window as unknown as { __prologue: object }
  // Whether an entity by that name is in the scene and drawn (the camp's sight cone, campView.ts).
  const shown = (name: string): boolean => {
    return app.root.findByName(name)?.enabled ?? false
  }

  w.__prologue = { ...w.__prologue, capture, release, visit, record, sampleMoment, shown, samples: () => rec.samples, poses: () => Object.keys(poses) }
}

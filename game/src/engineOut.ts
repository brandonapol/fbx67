import type { SceneId } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import { place, pov } from '../../text-game/src/story.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Interactable, Vec } from './world.ts'
import { add, angleTo, distance, scale, sub, vec } from './world.ts'
import { CABIN_FLOOR, OWEN_SEAT, onBoard } from './flight.ts'
import type { Night, Place } from './survivalPlay.ts'
import { JAKE_HEIGHT, jakeLook } from './bushStrip.ts'

// Engine out (a3_crash; docs/acts/act3-missions.md section 2, issue #186): the crash as a set piece, and the hillside
// it ends on, where the long night plays (survivalPlay.ts). The crash is a cutscene, as the flight north is (flight.ts):
// where the plane is is a pure function of the seconds since it began, nothing in it is played, and interact skips it.
// Forty minutes out the engine coughs, then again; Jake works the primer; the spruce come up; the impact, and black.
// When Lucy comes to, the story's own order prompt opens over the wreck. The story hears nothing of the crash: its note
// is the order, which the night sends at first light.
//
// Then the night: its panel picks the tasks, and Lucy walks between its four places on the hillside (the cabin, the
// fire, the spruce, the open slope) as its walks run. Where she stands is read off the night, never the other way: the
// order and the signal are the panel's deliberate prompts, not read off where she walks (Rule 3).

// --- The crash's beats, in seconds since it began --------------------------------------------------------------------

// The two coughs, Jake on the primer from the second, the spruce coming up, the impact, and coming to in the cabin.
export const COUGHS: readonly number[] = [1.5, 3.5]
export const PRIMER = 3.5
export const SPRUCE = 8
export const IMPACT = 10
export const CRASH_TIME = 13

// The dip to black at the impact: FADE_IN seconds down to it, black until she comes to, FADE_OUT back up.
export const FADE_IN = 0.4
export const FADE_OUT = 1.2

export const crashing = (t: number | undefined): t is number => t !== undefined

// Before the impact the plane is in the air; after it, the wreck lies where it came down.
export const gliding = (t: number | undefined): boolean => crashing(t) && t < IMPACT

// How black the screen is at `t`; clear when nothing is crashing.
export const crashFade = (t: number | undefined): number => {
  if (!crashing(t)) return 0
  if (t < IMPACT - FADE_IN) return 0
  if (t < IMPACT) return (t - (IMPACT - FADE_IN)) / FADE_IN
  if (t < CRASH_TIME - FADE_OUT) return 1
  return Math.max(0, (CRASH_TIME - t) / FADE_OUT)
}

// What the crash sounds like between two frames: the engine's coughs, and the impact (soundscape.ts, act3 beats).
export type CrashCue = 'cough' | 'impact'

export const crashCues = (from: number | undefined, to: number | undefined): readonly CrashCue[] => {
  if (!crashing(to)) return []
  const a = from ?? -1
  const crossed = (at: number): boolean => a < at && to >= at
  return [...COUGHS.filter(crossed).map((): CrashCue => 'cough'), ...(crossed(IMPACT) ? ['impact' as const] : [])]
}

// --- The hillside ----------------------------------------------------------------------------------------------------

// The fire in the lee of the fuselage, and the stand of black spruce the plane went into (soundscape.ts places the
// fire's crackle and the spruce cracking here).
export const FIRE_AT = vec(1.5, 2)
export const SPRUCE_AT = vec(-6, -8)

// The fuselage lies on its side along x, nose west into the spruce, its cabin door up and to the south.
export const WRECK_AT = vec(0, -0.6)
export const WRECK_HEADING = -Math.PI / 2

// Where the plane came from: high out of the east-southeast, gliding down the hill into the stand.
const FROM = vec(70, 18)
const FROM_Y = 45
const INTO = vec(-4, -2)
const INTO_Y = 6

// Where the plane is: the hull's middle on the ground plane, how high, its heading and its bank.
export type Glide = Readonly<{ at: Vec; y: number; heading: number; roll: number }>

const ease = (u: number): number => u * u * (3 - 2 * u)

// The plane `t` seconds into the crash: losing height after each cough, the nose down once the spruce come up and a
// wing dropping into them; at the impact and after, the wreck where it lies.
export const planeIn = (t: number): Glide => {
  const heading = angleTo(FROM, INTO)
  if (t >= IMPACT) return { at: WRECK_AT, y: 0, heading: WRECK_HEADING, roll: Math.PI / 2 }
  const u = Math.max(0, t) / IMPACT
  const at = add(FROM, scale(sub(INTO, FROM), u))
  const y = FROM_Y + (INTO_Y - FROM_Y) * ease(u)
  const roll = t < SPRUCE ? 0 : (-0.5 * (t - SPRUCE)) / (IMPACT - SPRUCE)
  return { at, y, heading, roll }
}

// Lucy in the right seat, as Owen rode north (flight.ts): where she sits `t` seconds into the crash.
export const lucySeat = (t: number): Readonly<{ at: Vec; y: number; heading: number }> => {
  const p = planeIn(t)
  return { at: onBoard({ at: p.at, y: p.y, heading: p.heading }, OWEN_SEAT), y: p.y + CABIN_FLOOR, heading: p.heading }
}

// What interact does while the plane comes down: skip to coming to.
export const SKIP = 'skipCrash'

export const skipSpot = (at: Vec): Interactable => ({ id: SKIP, x: at.x, z: at.z, r: 1, prompt: 'Skip the crash' })

// Where Lucy works at each of the night's places, and which way she faces there: at the cabin door over Jake, a meter
// from the fire, at the edge of the spruce, and out on the open slope below the wreck, facing up at the sky's line.
export const PLACE_AT: Readonly<Record<Place, Vec>> = {
  cabin: vec(-0.4, 0.5),
  fire: vec(1.5, 3),
  trees: vec(-5, -5.5),
  slope: vec(9, 7),
}

const LOOKS_AT: Readonly<Record<Place, Vec>> = {
  cabin: vec(-0.4, -0.6),
  fire: FIRE_AT,
  trees: SPRUCE_AT,
  slope: vec(14, 12),
}

// Where she comes to: at the cabin, over Jake.
export const COME_TO = PLACE_AT.cabin
export const COME_TO_FACING = angleTo(PLACE_AT.cabin, LOOKS_AT.cabin)

export type Stand = Readonly<{ at: Vec; facing: number; vel: Vec }>

// Where Lucy is during the night: at her place, facing her work there; or on the way to the next, as far along as the
// walk under way has gone, at the walk's pace (numb feet stretch it, survivalPlay.ts).
export const standOf = (n: Night): Stand => {
  const here = n.run.carried.at
  const d = n.doing
  const to = d?.verb.startsWith('go:') ? (d.verb.slice(3) as Place) : undefined
  if (!d || !to) return { at: PLACE_AT[here], facing: angleTo(PLACE_AT[here], LOOKS_AT[here]), vel: vec(0, 0) }
  const [a, b] = [PLACE_AT[here], PLACE_AT[to]]
  const u = Math.min(1, Math.max(0, 1 - d.left / d.total))
  const heading = angleTo(a, b)
  return { at: add(a, scale(sub(b, a), u)), facing: heading, vel: scale(sub(b, a), 1 / Math.max(d.total, 1e-6)) }
}

// How fast she is walking, for the walk clip: none at her work.
export const walkSpeed = (s: Stand): number => distance(vec(0, 0), s.vel)

// --- The space's props -----------------------------------------------------------------------------------------------

const cream = '#d9d2bd'
const band = '#9b2f22'
const alloy = '#b9bcbc'
const spruce = '#1f2e24'
const snow = '#e9edf1'

// The wreck, drawn only once the plane is down (the plane itself flies the glide, render.ts): the fuselage on its side
// in the snow, the red band up its belly, the door to the sky; the torn-off wing across the slope, a float bent up,
// the tail broken off at the spruce, and the snapped tops of the trees it went through. It stops Lucy.
const wreckProps: readonly Prop[] = [
  { box: { x: WRECK_AT.x, z: WRECK_AT.z, w: 5.0, d: 1.3 }, h: 1.2, color: cream, solid: true, occludes: true },
  { box: { x: WRECK_AT.x, z: WRECK_AT.z - 0.66, w: 5.0, d: 0.06 }, h: 0.16, y: 0.55, color: band },
  { box: { x: WRECK_AT.x - 0.2, z: WRECK_AT.z, w: 1.0, d: 0.9 }, h: 0.04, y: 1.2, color: '#2a2a28' },
  { box: { x: WRECK_AT.x - 2.9, z: WRECK_AT.z, w: 0.9, d: 1.0 }, h: 0.9, color: '#3c3c3a', solid: true },
  { box: { x: 3.4, z: -2.6, w: 1.6, d: 2.2 }, h: 0.12, color: cream },
  { box: { x: 4.8, z: 1.4, w: 6.2, d: 1.5 }, h: 0.14, color: cream, solid: true },
  { box: { x: 0.6, z: -2.2, w: 6.0, d: 0.5 }, h: 0.45, y: 0.4, color: alloy, solid: true },
  { box: { x: -4.6, z: -3.4, w: 1.4, d: 0.4 }, h: 1.6, color: '#7a7a72' },
  { box: { x: -7.2, z: -3.0, w: 0.3, d: 2.4 }, h: 0.3, color: '#3b2a1c' },
  { box: { x: -5.4, z: -2.2, w: 0.3, d: 2.4 }, h: 0.3, color: '#3b2a1c' },
].map((p): Prop => ({ ...p, while: 'wrecked' }))

// The black spruce of the hillside: a stand where the plane went in, thinning out down the open slope.
const TREES: readonly (readonly [number, number, number])[] = [
  [-6, -8, 7],
  [-8.5, -6, 6],
  [-4, -10, 6.5],
  [-9.5, -10, 7.5],
  [-11, -5, 5.5],
  [-2.5, -7, 5],
  [-7, -12.5, 6],
  [-12.5, -8.5, 6.5],
  [-3, -13, 5.5],
  [1, -9.5, 5],
  [4, -11, 6],
  [7.5, -8, 5],
  [-11, 1, 6],
  [-13, 5, 5.5],
  [-8.5, 4, 4.5],
  [11, -4, 5],
  [13, 3, 4.5],
  [-4, 11, 4],
  [2, 13.5, 4.5],
]

const trees: readonly Prop[] = TREES.flatMap(([x, z, h]): readonly Prop[] => [
  { box: { x, z, w: 0.3, d: 0.3 }, h: 1.0, color: '#3b2a1c', solid: true, occludes: true },
  { box: { x, z, w: h * 0.32, d: h * 0.32 }, h: h - 0.8, y: 0.8, color: spruce, shape: 'cone' },
])

// The fire in the lee of the fuselage: the stones ringed in the snow always, its glow only while it burns (render.ts
// reads the night); the X stamped on the open slope once she has stamped it.
const camp: readonly Prop[] = [
  { box: { x: FIRE_AT.x, z: FIRE_AT.z, w: 1.0, d: 1.0 }, h: 0.12, color: '#5a5a58', shape: 'cylinder', while: 'wrecked' },
  { box: { x: FIRE_AT.x, z: FIRE_AT.z, w: 0.6, d: 0.6 }, h: 0.5, y: 0.12, color: '#ff9a3a', glow: true, shape: 'cone', while: 'burning' },
  { box: { x: 11, z: 9, w: 6, d: 0.9 }, h: 0.02, color: '#7d8a96', flat: true, while: 'stamped' },
  { box: { x: 11, z: 9, w: 0.9, d: 6 }, h: 0.02, color: '#7d8a96', flat: true, while: 'stamped' },
]

// The edge of the hillside: drifts the player never reaches, since the night's panel walks her.
const drifts: readonly Prop[] = [
  { box: { x: 0, z: -16, w: 34, d: 1 }, h: 1.2, color: snow, solid: true },
  { box: { x: 0, z: 16, w: 34, d: 1 }, h: 0.6, color: snow, solid: true },
  { box: { x: -16, z: 0, w: 1, d: 32 }, h: 1.2, color: snow, solid: true },
  { box: { x: 16, z: 0, w: 1, d: 32 }, h: 0.6, color: snow, solid: true },
]

// Jake, pinned at the cabin door (bushStrip.ts's Jake, six foot seven). Hidden while the plane is in the air: he is in
// it, at the stick (render.ts).
export const JAKE_ID = 'jake'

const jake: Figure = { ...jakeLook, id: JAKE_ID, at: vec(0.6, 0.2), facing: Math.PI, height: JAKE_HEIGHT, activity: 'sit' }

// The scenes the hillside plays, read off the story: those at the crash site played as Lucy, the crash and the night.
// Wade's at the wreck the next morning (the mission `theWreck`) are their own ticket and still play over the story
// backdrop.
export const WRECK_SCENES: readonly SceneId[] = sceneIds.filter((scene) => {
  const s = { ...initialState, scene }
  return place(s) === 'crashSite' && pov(s) === 'lucy'
})

// The space, everything but its id: levels.ts adds it as `wreck`.
export const wreckSpace: Omit<Space, 'id'> = {
  act: 'Act 3: Deep Winter',
  place: 'crashSite',
  scenes: WRECK_SCENES,
  name: 'The wreck',
  size: { w: 32, d: 32 },
  interior: false,
  ground: snow,
  spawn: COME_TO,
  props: [...wreckProps, ...camp, ...trees, ...drifts],
  figures: [jake],
  spots: [],
}

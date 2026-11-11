import type { State } from '../../text-game/src/types.ts'
import { barnetteStops, barnetteTrustsWade } from '../../text-game/src/logic.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Interactable, Vec } from './world.ts'
import { add, scale, vec } from './world.ts'

// Before the dark (a2_heat, place `richardsonHighway`, 30 November at 13:00): Wade in a borrowed truck on the
// Richardson Highway, the low sun, the spruce, the snowbanks (#209). Where Barnette stops him, the story's text says
// so, and the engine stages it from the same gate: barnetteStops for the stop, and barnetteTrustsWade for the lean in
// the window (text-game/src/logic.ts), never a copy of the numbers. A staged drive, not a driving game: the truck and the
// cruiser go along fixed tracks whatever the player does, the player only turns the camera, and interact skips to the
// end, where the scene's own menu comes up (its text says what Barnette said). Per #86 this is the world reacting to
// high heat: nothing here sends a note or adds state.
//
// Local x east, z south. The highway runs north and south through the space; Wade drives north (toward -z) in the
// northbound lane, and the turnout where the truck ends up is on the east shoulder.

export const stops = (s: State): boolean => barnetteStops(s)

export const leans = (s: State): boolean => barnetteStops(s) && !barnetteTrustsWade(s)

// The beats of the stage, in order: the drive; the lights coming up behind; pulling over; Barnette searching the truck;
// and, past his patience, leaning in the window. Without the stop, only the drive.
export type Beat = 'drive' | 'lights' | 'pullOver' | 'search' | 'lean'

const LENGTHS: Readonly<Record<Beat, number>> = { drive: 5, lights: 3, pullOver: 2, search: 6, lean: 3 }

// A drive with nobody behind: a little longer, and it ends at the same turnout, where Wade thinks it over.
const QUIET_DRIVE = 8

export const beatsFor = (s: State): readonly Beat[] =>
  stops(s) ? (['drive', 'lights', 'pullOver', 'search', ...(leans(s) ? (['lean'] as const) : [])] as const) : ['drive']

export const stageTime = (s: State): number => (stops(s) ? beatsFor(s).reduce((n, b) => n + LENGTHS[b], 0) : QUIET_DRIVE)

// The beat `t` seconds into the stage, or `done` once it is over.
export const beatAt = (s: State, t: number): Beat | 'done' => {
  if (!stops(s)) return t < QUIET_DRIVE ? 'drive' : 'done'
  const go = (bs: readonly Beat[], left: number): Beat | 'done' =>
    bs.length === 0 ? 'done' : left < LENGTHS[bs[0]!] ? bs[0]! : go(bs.slice(1), left - LENGTHS[bs[0]!])
  return go(beatsFor(s), t)
}

// Seconds into the stage at which a beat starts.
const startOf = (b: Beat): number => {
  const order: readonly Beat[] = ['drive', 'lights', 'pullOver', 'search', 'lean']
  return order.slice(0, order.indexOf(b)).reduce((n, x) => n + LENGTHS[x], 0)
}

export type Pose = Readonly<{ at: Vec; heading: number }>

// A track: key poses at times, in order, walked straight between; before the first and after the last it holds.
type Key = readonly [t: number, x: number, z: number, heading: number]

const along = (keys: readonly Key[], t: number): Pose => {
  const i = keys.findIndex((k) => k[0] > t)
  if (i === 0) return { at: vec(keys[0]![1], keys[0]![2]), heading: keys[0]![3] }
  const a = keys[i === -1 ? keys.length - 1 : i - 1]!
  if (i === -1) return { at: vec(a[1], a[2]), heading: a[3] }
  const b = keys[i]!
  const k = (t - a[0]) / (b[0] - a[0])
  return { at: vec(a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k), heading: a[3] + (b[3] - a[3]) * k }
}

const NORTH = Math.PI
const WEST = -Math.PI / 2
const EAST = Math.PI / 2

export const LANE_X = 1.8
export const TURNOUT = vec(5.4, -18)

// The truck's middle, northbound: up the lane, then off onto the turnout. With Barnette behind it slows when his
// lights come up and pulls over; without him Wade pulls off there on his own to think.
const pulled = startOf('pullOver')
const ON_THE_ROAD: Key = [0, LANE_X, 40, NORTH]
const truckKeys = (s: State): readonly Key[] =>
  stops(s)
    ? [ON_THE_ROAD, [startOf('lights'), LANE_X, 0, NORTH], [pulled, LANE_X, -12, NORTH], [pulled + 1, 4.2, -16, NORTH - 0.3], [startOf('search'), TURNOUT.x, TURNOUT.z, NORTH]]
    : [ON_THE_ROAD, [6, LANE_X, -8, NORTH], [7, 4.2, -14, NORTH - 0.3], [QUIET_DRIVE, TURNOUT.x, TURNOUT.z, NORTH]]

// The cruiser closes from far back, holds behind with its lights on, and stops behind the truck on the turnout.
const CRUISER_PARK = vec(TURNOUT.x, TURNOUT.z + 8)
const cruiserKeys: readonly Key[] = [
  [0, LANE_X, 90, NORTH],
  [startOf('lights'), LANE_X, 14, NORTH],
  [pulled, LANE_X, -2, NORTH],
  [startOf('search'), CRUISER_PARK.x, CRUISER_PARK.z, NORTH],
]

export const TRUCK_LENGTH = 5.2
// Where Barnette stands to lean in at Wade's window: beside the driver's door on the west side, facing in.
export const WINDOW_AT = vec(TURNOUT.x - 1.35, TURNOUT.z - 0.6)

// Barnette out of the cruiser at the search: round the truck's bed, down its east side to look in the cab, and back
// round to the driver's side, where he leans in if he is past believing Wade.
const barnetteKeys = (): readonly Key[] => {
  const s0 = startOf('search')
  return [
    [s0, CRUISER_PARK.x - 1.0, CRUISER_PARK.z - 1.2, NORTH],
    [s0 + 1.5, TURNOUT.x + 1.5, TURNOUT.z + 2.4, NORTH],
    [s0 + 3, TURNOUT.x + 1.5, TURNOUT.z - 0.8, WEST],
    [s0 + 4.5, TURNOUT.x - 0.6, TURNOUT.z + 3.2, WEST],
    [s0 + LENGTHS.search, TURNOUT.x - 1.4, TURNOUT.z + 1.2, NORTH],
    [startOf('lean') + 1, WINDOW_AT.x, WINDOW_AT.z, EAST],
  ]
}

export const truckAt = (s: State, t: number): Pose => along(truckKeys(s), t)

// Wade at the wheel: the driver's seat is on the truck's left, a little ahead of its middle.
const seatIn = (p: Pose): Pose => {
  const forward = vec(Math.sin(p.heading), Math.cos(p.heading))
  const left = vec(Math.cos(p.heading), -Math.sin(p.heading))
  return { at: add(add(p.at, scale(left, 0.4)), scale(forward, 0.5)), heading: p.heading }
}

export const seatAt = (s: State, t: number): Pose => seatIn(truckAt(s, t))

export const cruiserAt = (s: State, t: number): Pose | undefined => (stops(s) ? along(cruiserKeys, t) : undefined)

export const lightsOn = (s: State, t: number): boolean => stops(s) && t >= startOf('lights')

// Red and blue in turn, twice a second, while the lights are on.
export const lightColor = (s: State, t: number): 'red' | 'blue' | undefined => (lightsOn(s, t) ? (Math.floor(t * 4) % 2 ? 'blue' : 'red') : undefined)

// Barnette on foot, from the search on; in his cruiser before it, and not on the road at all without the stop. Without
// the lean he waits at the driver's side when the search ends.
export const barnetteAt = (s: State, t: number): Pose | undefined =>
  stops(s) && t >= startOf('search') ? along(leans(s) ? barnetteKeys() : barnetteKeys().slice(0, -1), t) : undefined

// The wheel: at the end of the stage the scene's menu asks what Wade does now; during it, interact skips to the end.
export const WHEEL: Interactable = { id: 'wheel', x: TURNOUT.x - 0.4, z: TURNOUT.z - 0.5, r: 1.6, prompt: 'Think it over' }

export const SKIP_PROMPT = 'Skip ahead'

export const staged = (s: State, stop: number | undefined): boolean => stop !== undefined && stop < stageTime(s)

// The skip during the stage, where the truck is: interact takes it to the end and the menu.
export const skipAt = (at: Vec): Interactable => ({ id: WHEEL.id, x: at.x, z: at.z, r: 1, prompt: SKIP_PROMPT })

const snow = '#e6ebee'
const asphalt = '#3a3c3e'
const spruce = '#24382c'
const trunk = '#3e2e22'

const tree = (x: number, z: number, h: number): readonly Prop[] => [
  { box: { x, z, w: 0.25, d: 0.25 }, h: 0.8, color: trunk, shape: 'cylinder' },
  { box: { x, z, w: h * 0.35, d: h * 0.35 }, h, y: 0.6, color: spruce, shape: 'cone' },
]

const W = 40
const D = 150

// Spruce in two ragged rows back from the banks, by a fixed scatter so every frame is the same.
const TREES: readonly (readonly [number, number, number])[] = Array.from({ length: 30 }, (_, i) => {
  const side = i % 2 ? 1 : -1
  return [side * (10 + ((i * 7) % 9)), -70 + i * 4.7, 5 + ((i * 5) % 4)] as const
})

export const pieces: Readonly<Record<string, readonly Prop[]>> = {
  road: [{ box: { x: 0, z: 0, w: 7.2, d: D }, h: 0.02, color: asphalt, flat: true }],
  centerLine: Array.from({ length: 25 }, (_, i): Prop => ({ box: { x: 0, z: -72 + i * 6, w: 0.12, d: 3 }, h: 0.03, color: '#d8c86a', flat: true })),
  // The plowed shoulder and the turnout on the east side, packed snow over gravel.
  turnout: [{ box: { x: TURNOUT.x, z: TURNOUT.z + 4, w: 4, d: 22 }, h: 0.03, color: '#b9b4a8', flat: true }],
  // The banks the plow left, waist high, along both sides.
  banks: [
    { box: { x: -5.2, z: 0, w: 2.4, d: D }, h: 0.9, color: snow },
    { box: { x: 8.4, z: 0, w: 2.2, d: D }, h: 0.9, color: snow },
  ],
  spruce: TREES.flatMap(([x, z, h]) => tree(x, z, h)),
  // Power poles on the west side and their line, and a mile post at the turnout.
  poles: Array.from({ length: 6 }, (_, i): Prop => ({ box: { x: -8, z: -60 + i * 24, w: 0.25, d: 0.25 }, h: 7, color: '#4a3a2a', shape: 'cylinder' })),
  milePost: [{ box: { x: TURNOUT.x + 2.4, z: TURNOUT.z - 6, w: 0.12, d: 0.12 }, h: 1.4, color: '#5a5a52' }, { box: { x: TURNOUT.x + 2.4, z: TURNOUT.z - 6, w: 0.35, d: 0.05 }, h: 0.45, y: 1.1, color: '#2f5a3a' }],
}

// The truck and the cruiser in their own frames, as the boats are (boat.ts): x across, z forward, centered.
export const TRUCK_HULL: readonly Prop[] = [
  { box: { x: 0, z: 0, w: 1.9, d: TRUCK_LENGTH }, h: 0.7, y: 0.45, color: '#5a6a4a' },
  { box: { x: 0, z: 0.9, w: 1.8, d: 1.7 }, h: 0.85, y: 1.15, color: '#5a6a4a' },
  { box: { x: 0, z: 1.75, w: 1.6, d: 0.05 }, h: 0.6, y: 1.25, color: '#9fb2bc' },
  ...[-1.6, 1.6].flatMap((z) => [-0.85, 0.85].map((x): Prop => ({ box: { x, z, w: 0.3, d: 0.8 }, h: 0.8, color: '#1e1e1e', shape: 'cylinder' }))),
]

export const CRUISER_HULL: readonly Prop[] = [
  { box: { x: 0, z: 0, w: 1.9, d: 5.0 }, h: 0.7, y: 0.4, color: '#1d2a3a' },
  { box: { x: 0, z: -0.2, w: 1.75, d: 2.3 }, h: 0.6, y: 1.1, color: '#e8e8e2' },
  ...[-1.6, 1.6].flatMap((z) => [-0.85, 0.85].map((x): Prop => ({ box: { x, z, w: 0.3, d: 0.75 }, h: 0.75, color: '#1e1e1e', shape: 'cylinder' }))),
]

// The light bar on the cruiser's roof, its two lamps; the view lights one at a time from lightColor.
export const LIGHT_BAR: Readonly<Record<'red' | 'blue', Prop>> = {
  red: { box: { x: -0.45, z: -0.2, w: 0.5, d: 0.3 }, h: 0.2, y: 1.72, color: '#e0322a', glow: true },
  blue: { box: { x: 0.45, z: -0.2, w: 0.5, d: 0.3 }, h: 0.2, y: 1.72, color: '#2a5ae0', glow: true },
}

const figures: readonly Figure[] = [
  // Barnette, where the view does not stand him itself: at the window, and only on the road when he stops Wade.
  { id: 'barnette', at: WINDOW_AT, facing: EAST, coat: '#3a3a30', skin: '#d9b08a', hair: '#5a4a3a', height: 1.85, when: stops },
]

export const highway = {
  id: 'highway',
  act: 'Act 2: Freeze-up',
  place: 'richardsonHighway',
  name: 'The Richardson Highway',
  interior: false,
  size: { w: W, d: D },
  ground: '#dfe4e6',
  spawn: seatIn(along([ON_THE_ROAD], 0)).at,
  props: Object.values(pieces).flat(),
  figures,
  spots: [WHEEL],
} as const satisfies Omit<Space, 'id'> & Readonly<{ id: string }>

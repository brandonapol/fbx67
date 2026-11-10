import type { Prop, SpaceId } from './levels.ts'
import type { Interactable, Vec } from './world.ts'
import { angleTo, vec } from './world.ts'

// The flight north (p_dock's `fly`): Curly's floatplane off the Chena and down on the gravel bar at the survey camp.
// The story has its note the moment Owen climbs in; the flight is what the player sees of it, a short cinematic in two
// legs. Over town (the downtown space): the taxi out from the float, the takeoff run west down the Chena, and a climbing
// turn south over the town toward the Tanana, then north. At the camp (the camp space): the approach low along the
// river, the touchdown on the gravel bar on the wheels in the floats, and the roll up to where it parks. Where the
// plane is is a pure function of the seconds since Owen climbed in, so a frame at a given second is always the same
// frame. The player only turns the camera, held behind the heading; interact skips to the camp.

// Keyframes of the hull's middle, [x, z, y], KEY_STEP seconds apart, in each leg's space coordinates (x east, z south,
// y up). The curve through them is a Catmull-Rom spline, so the plane turns and climbs smoothly.
type Key = readonly [number, number, number]

export const KEY_STEP = 3

// Moored alongside the float's east edge (downtown.ts FLOAT), nose north to the river.
export const MOORED = vec(129.2, -16)
export const MOORED_HEADING = Math.PI

const OVER_TOWN: readonly Key[] = [
  [MOORED.x, MOORED.z, 0],
  [129.2, -24, 0],
  [126, -33, 0],
  [112, -37, 0],
  [88, -37, 0],
  [55, -37, 0],
  [15, -37, 3],
  [-25, -30, 18],
  [-50, 10, 40],
  [-30, 60, 65],
  [30, 110, 90],
  [110, 140, 110],
  [180, 120, 130],
  [220, 70, 150],
]

// Parked on the gravel bar below the camp, where the camp's own plane stands (levels.ts camp), nose up the bar.
export const PARKED = vec(-9, 7.2)

const AT_CAMP: readonly Key[] = [
  [70, 11, 40],
  [40, 10.5, 22],
  [14, 10, 6],
  [-2, 10, 0],
  [-9, 10.5, 0],
  [-9.6, 9, 0],
  [PARKED.x, PARKED.z, 0],
]

const legTime = (keys: readonly Key[]): number => (keys.length - 1) * KEY_STEP

// Seconds over town, then at the camp; the flight is over at FLIGHT_TIME.
export const TOWN_TIME = legTime(OVER_TOWN)
export const FLIGHT_TIME = TOWN_TIME + legTime(AT_CAMP)

export type Leg = Extract<SpaceId, 'downtown' | 'camp'>

// The space the flight is in at `t`: over town, then at the camp.
export const legAt = (t: number): Leg => (t < TOWN_TIME ? 'downtown' : 'camp')

export const flying = (t: number | undefined): t is number => t !== undefined

export const landed = (t: number | undefined): boolean => flying(t) && t >= FLIGHT_TIME

// Where the plane is: the hull's middle on the ground plane, how high it is, and its heading.
export type Pose = Readonly<{ at: Vec; y: number; heading: number }>

const cr = (p0: number, p1: number, p2: number, p3: number, u: number): number =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)

const dcr = (p0: number, p1: number, p2: number, p3: number, u: number): number =>
  0.5 * (-p0 + p2 + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * u + 3 * (-p0 + 3 * p1 - 3 * p2 + p3) * u * u)

const along = (keys: readonly Key[], t: number): Pose => {
  const last = keys.length - 1
  const s = Math.min(last, Math.max(0, t / KEY_STEP))
  const i = Math.min(last - 1, Math.floor(s))
  const u = s - i
  const k = (j: number): Key => keys[Math.max(0, Math.min(last, j))]!
  const [p0, p1, p2, p3] = [k(i - 1), k(i), k(i + 1), k(i + 2)]
  const c = (n: 0 | 1 | 2): number => cr(p0[n], p1[n], p2[n], p3[n], u)
  const d = (n: 0 | 1 | 2): number => dcr(p0[n], p1[n], p2[n], p3[n], u)
  return { at: vec(c(0), c(1)), y: Math.max(0, c(2)), heading: angleTo(vec(0, 0), vec(d(0), d(1))) }
}

// The plane `t` seconds after Owen climbs in; before it, moored at the float.
export const planeAt = (t = 0): Pose => (t < TOWN_TIME ? along(OVER_TOWN, t) : along(AT_CAMP, t - TOWN_TIME))

// The plane when nobody is flying it: moored downtown, parked at the camp.
export const restingIn = (leg: Leg): Pose => (leg === 'downtown' ? planeAt(0) : planeAt(FLIGHT_TIME))

// A point in the plane's own frame (x across to starboard, z forward to the nose) in the space's.
export const onBoard = (p: Pose, local: Vec): Vec => {
  const [s, c] = [Math.sin(p.heading), Math.cos(p.heading)]
  return vec(p.at.x + local.x * c + local.z * s, p.at.z - local.x * s + local.z * c)
}

// Curly flies from the left seat, Owen rides in the right with the satchel on his knees; the cabin floor's height.
export const PILOT_SEAT = vec(-0.3, 1.2)
export const OWEN_SEAT = vec(0.3, 1.2)
export const CABIN_FLOOR = 1.0

export type Seat = Readonly<{ at: Vec; y: number; heading: number }>

export const seatAt = (t: number, local: Vec): Seat => {
  const p = planeAt(t)
  return { at: onBoard(p, local), y: p.y + CABIN_FLOOR, heading: p.heading }
}

// What interact does while flying: skip to the camp.
export const SKIP = 'skip'

export const skipSpot = (at: Vec): Interactable => ({ id: SKIP, x: at.x, z: at.z, r: 1, prompt: 'Skip the flight' })

// The plane in its own frame: a high-wing bush plane on amphibian floats, cream with a red band, a fictional tail
// number. The fuselage is a box the camera may sit inside: its faces are drawn one-sided, so from the right seat the
// view is out through the cabin under the wing.
const cream = '#d9d2bd'
const band = '#9b2f22'
const alloy = '#b9bcbc'
const strut = '#6b6b66'

export const planeHull: readonly Prop[] = [
  // The floats, with their spreader bars, and the struts up to the fuselage.
  ...[-1.3, 1.3].map((x): Prop => ({ box: { x, z: 0.2, w: 0.5, d: 6.4 }, h: 0.45, color: alloy })),
  ...[1.6, -1.4].map((z): Prop => ({ box: { x: 0, z, w: 2.6, d: 0.1 }, h: 0.08, y: 0.45, color: strut })),
  ...[-1.0, 1.0].flatMap((x) => [1.6, -0.4].map((z): Prop => ({ box: { x, z, w: 0.08, d: 0.08 }, h: 0.6, y: 0.45, color: strut }))),
  // The fuselage, the red band down its side, the engine cowl and the propeller.
  { box: { x: 0, z: 0.4, w: 1.2, d: 5.0 }, h: 1.3, y: CABIN_FLOOR, color: cream },
  { box: { x: 0, z: 0.4, w: 1.24, d: 5.0 }, h: 0.16, y: CABIN_FLOOR + 0.55, color: band },
  { box: { x: 0, z: -3.0, w: 0.7, d: 2.0 }, h: 0.8, y: CABIN_FLOOR + 0.4, color: cream },
  { box: { x: 0, z: 3.25, w: 1.0, d: 0.7 }, h: 0.9, y: CABIN_FLOOR + 0.2, color: '#3c3c3a' },
  { box: { x: 0, z: 3.65, w: 2.0, d: 0.05 }, h: 0.12, y: CABIN_FLOOR + 0.6, color: '#2a2a28' },
  // The high wing over the cabin and its two lift struts down to the fuselage's belly.
  { box: { x: 0, z: 0.9, w: 11, d: 1.6 }, h: 0.14, y: CABIN_FLOOR + 1.35, color: cream },
  ...[-1, 1].map((side): Prop => ({ box: { x: side * 1.8, z: 0.9, w: 2.4, d: 0.08 }, h: 0.06, y: CABIN_FLOOR + 0.7, color: strut })),
  // The tail: the stabilizer and the fin, the band on the fin, its number.
  { box: { x: 0, z: -3.9, w: 3.4, d: 0.9 }, h: 0.08, y: CABIN_FLOOR + 0.9, color: cream },
  { box: { x: 0, z: -3.9, w: 0.1, d: 1.1 }, h: 1.4, y: CABIN_FLOOR + 1.0, color: cream },
  { box: { x: 0, z: -3.9, w: 0.12, d: 1.1 }, h: 0.2, y: CABIN_FLOOR + 1.9, color: band },
  { box: { x: 0, z: -2.6, w: 1.22, d: 0.9 }, h: 0.2, y: CABIN_FLOOR + 0.95, color: '#2a2a28' },
]

import type { Prop } from './levels.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import type { Boat, Ride } from './boat.ts'
import { course } from './boat.ts'

// The skiff on flooded Third (docs/town-map.md, "August: the skiff"), and the ride after Owen climbs in. World
// coordinates off the town map: x east, z south. The skiff lies across the street from Owen's steps with its bow to
// the south; the man in the hooded slicker stands in the bow with his back to the house and the pole in his hands.
// Owen climbs into the stern. The story has its note the moment he does (p_end's `continue`); the ride is what
// the player sees of it, a slow pole west down Third and north up Lacey, the man's back to the camera, ending on black.
//
// His face is never seen. Two things hold that, and the tests check both: on the steps, Owen's walk (highwater.ts)
// stops short enough of the bow that the camera's arm can never reach past the man's face; in the skiff the camera
// may turn at most RIDE_LOOK either side of the heading, so it always hangs behind Owen, who sits behind the man.

// The way the skiff goes, as the line Owen's seat follows: off the steps, west down Third, round the corner at Lacey
// and north toward the river.
export const RIDE_PATH: readonly Vec[] = [vec(135.2, 100.0), vec(135.2, 103.0), vec(88, 103.0), vec(81, 96), vec(81, 82)]

// Owen sits in the stern and the man stands in the bow, BOW apart along the path; the hull's middle is halfway.
export const BOW = 2.4

// Poled, slow: about a walking pace.
export const RIDE_SPEED = 2.2

// The last seconds of the ride fade to black; the end card comes up on the black.
export const RIDE_FADE = 3

// How far either side of the heading the player may turn the camera while riding.
export const RIDE_LOOK = (80 * Math.PI) / 180

// The man stands a little proud of the hull's floor; Owen sits on the stern thwart.
export const DECK_Y = 0.25

const skiffCourse = course(RIDE_PATH, BOW, RIDE_SPEED)

export const RIDE_LENGTH = skiffCourse.length

export const RIDE_TIME = skiffCourse.time

// Where the skiff is `t` seconds into the ride (before it, at the steps): Owen's seat, the man in the bow, the hull's
// middle, and the heading from the one to the other.
export type { Ride }

export const rideAt = skiffCourse.at

export const SKIFF = rideAt()

// The skiff's spot, where Owen climbs in: its stern at the edge of the walk.
export const BOARD_AT = vec(SKIFF.seat.x, 99.4)

export const riding = (t: number | undefined): t is number => t !== undefined

export const rideOver = (t: number | undefined): boolean => riding(t) && t >= RIDE_TIME

// How black the screen is: clear until the last RIDE_FADE seconds, then to full black, and black under the end card.
export const fade = (t: number | undefined): number => (riding(t) ? Math.min(1, Math.max(0, (t - (RIDE_TIME - RIDE_FADE)) / RIDE_FADE)) : 0)

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a))

// The camera's yaw held within RIDE_LOOK of the heading.
export const keepBehind = (yaw: number, heading: number): number => heading + Math.max(-RIDE_LOOK, Math.min(RIDE_LOOK, wrap(yaw - heading)))

// The camera volume the man's face can be seen from: anywhere ahead of the plane of his back, FACE_MARGIN of slack
// included. Seen from behind or square from the side, the hood hides it.
export const FACE_MARGIN = 0.1

export const faceSeen = (eye: readonly [number, number, number], man: Readonly<{ at: Vec; facing: number }>): boolean =>
  (eye[0] - man.at.x) * Math.sin(man.facing) + (eye[2] - man.at.z) * Math.cos(man.facing) > -FACE_MARGIN

// The man, at the steps or on the ride.
export const manAt = (t: number | undefined): Readonly<{ at: Vec; facing: number }> => {
  const r = rideAt(t ?? 0)
  return { at: r.bow, facing: r.heading }
}

// The hull in the skiff's own frame: x across, z forward to the bow. Flat-bottomed, square-sterned, the outboard
// tilted up out of the water, the pole stood up beside him.
const wood = '#6a5a44'
const paint = '#7d8a7a'
const HULL_L = 3.6
const BEAM = 1.3

export const hull: readonly Prop[] = [
  { box: { x: 0, z: 0, w: BEAM, d: HULL_L }, h: 0.1, y: 0.15, color: wood },
  { box: { x: -BEAM / 2 + 0.03, z: 0, w: 0.06, d: HULL_L }, h: 0.38, y: 0.15, color: paint },
  { box: { x: BEAM / 2 - 0.03, z: 0, w: 0.06, d: HULL_L }, h: 0.38, y: 0.15, color: paint },
  { box: { x: 0, z: -HULL_L / 2, w: BEAM, d: 0.06 }, h: 0.38, y: 0.15, color: paint },
  { box: { x: 0, z: HULL_L / 2, w: BEAM * 0.7, d: 0.06 }, h: 0.42, y: 0.15, color: paint },
  { box: { x: 0, z: -BOW / 2, w: BEAM - 0.1, d: 0.25 }, h: 0.05, y: 0.42, color: wood },
  { box: { x: 0, z: -HULL_L / 2 - 0.2, w: 0.3, d: 0.35 }, h: 0.45, y: 0.45, color: '#3a3c3e' },
  { box: { x: 0.35, z: BOW / 2 + 0.15, w: 0.05, d: 0.05 }, h: 3.2, y: 0.2, color: '#8a7a5a', shape: 'cylinder' },
]

export const skiff: Boat = { course: skiffCourse, hull, man: 'hooded', deck: DECK_Y }

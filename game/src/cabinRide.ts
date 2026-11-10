import type { Prop, Space, SpaceId } from './levels.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import type { Boat } from './boat.ts'
import { ELI_AHEAD, RIVERBOAT_DECK, course, riverboatHull } from './boat.ts'
import { skiff } from './skiff.ts'
import { BODY_AT, KNOT_SPOT, SAWHORSE_AT, knotProps } from './knot.ts'

// The cabin (a1_body, place `floodCabin`): the evening of 15 August, Eli's riverboat out of town along a flooded
// slough to a half-sunk cabin on the edge of town, where his pole finds Owen. docs/town-map.md keeps the cabin off the
// walkable map, so this is its own space, in its own coordinates: x east, z south, the slough running north from the
// edge of town to the cabin.
//
// Wade is in the boat from the first frame: whichever way the search for Eli ended (the sergeant lends him out, or
// Eli asks for him by name), the story is already at a1_body, and the ride is what the player sees on the way. The
// boat poles on whatever the player does; at the end of the course the bow stops beside the body, and the scene's
// menu comes up as its panel. Nothing here decides what anyone says or what a choice does.
//
// The body is staged with restraint: the back of a dark shirt at the surface, a yellow braided line drawn taut from it
// to the drowned sawhorse under the water. No face, no skin, nothing to linger on.

// The line Wade's seat follows: up the slough from the town's edge, a bend past the drowned spruce, and in to the
// cabin. The ride ends when Eli, in the bow, reaches its end, with the body off the bow to starboard.
export const CABIN_PATH: readonly Vec[] = [vec(-3, 27), vec(-3, 9), vec(0.6, 0), vec(2.4, -8.6)]

// Poled through the shallows, a little slower than the skiff in a street.
export const CABIN_SPEED = 2.0

export const cabinRide = course(CABIN_PATH, ELI_AHEAD, CABIN_SPEED)

export const riverboat: Boat = { course: cabinRide, hull: riverboatHull, man: 'eli', deck: RIVERBOAT_DECK }

// The boat a space's ride is in: Eli's riverboat to the cabin, else the skiff on Third.
export const boatIn = (space: SpaceId): Boat => (space === 'cabin' ? riverboat : skiff)

// Where the body is, and the drowned sawhorse it is tied to (knot.ts, where the line and its knot are).
export { BODY_AT, SAWHORSE_AT }
const BODY_D = 1.0

const flood = '#4f4a3c'
const under = '#3f3b30'
const logs = '#5e4a34'
const roof = '#4a3e30'
const spruce = '#2f4433'
const birch = '#cfc8b4'

const CABIN = vec(8.0, -13.5)

const spruces: readonly (readonly [number, number, number])[] = [
  [-11, 22, 5],
  [-9, 13, 6],
  [-13, 4, 5.5],
  [-8.5, -4, 6.5],
  [-12, -14, 6],
  [-6, -20, 7],
  [6, 20, 5],
  [9.5, 11, 6],
  [12, 2, 5.5],
  [14, -6, 6],
  [2, -24, 6.5],
  [15, -20, 6],
]

const birches: readonly (readonly [number, number])[] = [
  [-7, 18],
  [-6.5, 2],
  [7, 6],
  [11, -9],
  [-3, -15],
]

const props: readonly Prop[] = [
  // Drowned spruce and birch standing out of the water either side of the slough.
  ...spruces.map(([x, z, h]): Prop => ({ box: { x, z, w: 2.2, d: 2.2 }, h, color: spruce, solid: true, occludes: true, shape: 'cone' })),
  ...birches.map(([x, z]): Prop => ({ box: { x, z, w: 0.25, d: 0.25 }, h: 5, color: birch, solid: true, shape: 'cylinder' })),
  ...birches.map(([x, z]): Prop => ({ box: { x, z, w: 2.0, d: 2.0 }, h: 2.2, y: 3.4, color: '#6b7a44', shape: 'cone' })),
  // Willow tops just clear of the water.
  ...[
    [-5.6, 12],
    [-6.2, -6],
    [4.2, 14],
    [5.6, -2],
  ].map(([x, z]): Prop => ({ box: { x: x!, z: z!, w: 1.6, d: 1.2 }, h: 0.5, color: '#5b6a3a' })),
  // The cabin, sunk to the eaves: the top courses of its logs, a dark window gap, a sagging roof and its stovepipe.
  { box: { x: CABIN.x, z: CABIN.z, w: 6, d: 5 }, h: 1.3, color: logs, solid: true, occludes: true },
  { box: { x: CABIN.x - 1.2, z: CABIN.z + 2.52, w: 0.9, d: 0.05 }, h: 0.55, y: 0.2, color: '#1c1a16' },
  { box: { x: CABIN.x - 1.5, z: CABIN.z, w: 3.4, d: 5.6 }, h: 0.22, y: 1.3, color: roof },
  { box: { x: CABIN.x + 1.6, z: CABIN.z, w: 3.0, d: 5.6 }, h: 0.22, y: 1.18, color: roof },
  { box: { x: CABIN.x + 1.8, z: CABIN.z - 1.2, w: 0.2, d: 0.2 }, h: 0.9, y: 1.3, color: '#2e2e2c', shape: 'cylinder' },
  // A clothesline post by the cabin, and what the water has brought down: boards, a gas can, a chair on its side.
  { box: { x: 4.8, z: -15.2, w: 0.15, d: 0.15 }, h: 1.6, color: '#6a5a44' },
  { box: { x: -5.2, z: 4, w: 0.3, d: 2.2 }, h: 0.06, color: '#7a6248', flat: true },
  { box: { x: -1.8, z: -4.2, w: 0.35, d: 0.25 }, h: 0.22, color: '#7a2a1c' },
  { box: { x: -4.6, z: -10.5, w: 0.5, d: 0.5 }, h: 0.4, color: '#5a3f2a' },
  // The sawhorse, drowned: a darker shape under the surface at the corner of the cabin's yard.
  { box: { x: SAWHORSE_AT.x, z: SAWHORSE_AT.z, w: 1.4, d: 0.5 }, h: 0.01, color: under, flat: true },
  // The yellow braided line from the sawhorse to the body, taut along the surface, and its backward bowline.
  ...knotProps,
  // Owen: the back of a dark shirt just breaking the surface, nothing more.
  { box: { x: BODY_AT.x, z: BODY_AT.z + BODY_D / 2, w: 0.55, d: BODY_D }, h: 0.05, color: '#34322e' },
]

const start = cabinRide.at(0)

export const cabin: Space = {
  id: 'cabin',
  act: 'Act 1: Flood',
  place: 'floodCabin',
  name: 'The cabin',
  interior: false,
  size: { w: 44, d: 64 },
  ground: flood,
  spawn: start.seat,
  props,
  figures: [{ id: 'eli', at: start.bow, facing: start.heading, coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 }],
  spots: [KNOT_SPOT],
}

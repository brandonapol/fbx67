import type { Prop } from './levels.ts'
import type { Rect } from './downtown.ts'
import { PLAY, spawnAt } from './downtown.ts'
import { vec } from './world.ts'

// High water, 14 August 1967: the August flood as a layer over the July town (docs/town-map.md, "The flood"). The
// flooded street is downtown's own data, the same blocks Owen walked home through in July, with this laid over it:
// brown water over every street, the plank walkway the block put down along Third, a pickup in water to its windows,
// a family going by in a boat with their dog, neighbors up on the roofs, drums and boards adrift, and the bar row's
// neon still lit on Second. Inside the boarding house the ground floor is under water and the furniture floats.
//
// The engine's ground is flat at y 0 (downtown.ts, pass 1), so the water is drawn at its depth at Owen's door,
// WATER_Y, the town map's shin-deep 0.33 m on Third; depth elsewhere is shown by what is sunk in it. Owen walks
// on decks: the porch at his door and the walkway, which stand above the water. Nothing in the dressing is solid;
// what stops him is the water off the walkway's edges (blockers below), so the town never changes where July walks.

export const WATER_Y = 0.33

const rect = (r: Rect) => ({ x: (r[0] + r[1]) / 2, z: (r[2] + r[3]) / 2, w: r[1] - r[0], d: r[3] - r[2] })

const water = '#5b4b37'
const boards = '#7a6248'

// Owen's door is at (134, 96) on Third's north walk (z 96..99). The block laid planks on sawhorses along the walk;
// his porch is a step up at the door.
export const WALKWAY: Rect = [118, 154, 96.1, 98.9]
export const PORCH: Rect = [131.5, 136.5, 96.0, 98.4]
const WALK_TOP = 0.42
const PORCH_TOP = 0.6

// Where Owen comes out: the town map's floodedStreet spawn, on the porch, turned to face the street.
const out = spawnAt('floodedStreet')
export const FLOOD_AT = vec(out.x, out.z)
export const FLOOD_FACING = 0

const blocker = (r: Rect): Prop => ({ box: rect(r), h: 0.01, color: '#000000', solid: true })

// The water past the walkway's south edge and its two ends.
export const banks: readonly Prop[] = [
  blocker([116, 156, WALKWAY[3] + 0.15, 100.2]),
  blocker([116, WALKWAY[0] - 0.1, 95, 100.2]),
  blocker([WALKWAY[1] + 0.1, 156, 95, 100.2]),
]

const decks: readonly Prop[] = [
  { box: rect(WALKWAY), h: 0.12, y: WALK_TOP - 0.12, color: boards, flat: true, deck: true },
  { box: rect(PORCH), h: 0.18, y: PORCH_TOP - 0.18, color: '#6e5a44', flat: true, deck: true },
  ...[118.5, 126, 141, 148, 153.5].flatMap((x): Prop[] =>
    [96.4, 98.6].map((z): Prop => ({ box: { x, z, w: 0.12, d: 0.12 }, h: 0.3, color: '#4e4232' })),
  ),
]

const sheet: Prop = { box: rect([PLAY[0] - 40, PLAY[1] + 40, PLAY[2] - 60, PLAY[3]]), h: WATER_Y, color: water, flat: true }

// Someone standing or sitting, drawn as a body and a head, with the soles at y.
const person = (x: number, z: number, y: number, coat: string, h = 1.7): readonly Prop[] => [
  { box: { x, z, w: 0.45, d: 0.4 }, h: h * 0.62, y, color: coat, shape: 'cylinder' },
  { box: { x, z, w: 0.24, d: 0.26 }, h: 0.28, y: y + h * 0.66, color: '#d2a684' },
]

// A pickup on Third sunk to its windows.
const pickup: readonly Prop[] = [
  { box: { x: 111, z: 104.5, w: 5.2, d: 2.0 }, h: 0.85, y: -0.5, color: '#7a5a3a' },
  { box: { x: 112.4, z: 104.5, w: 1.6, d: 1.9 }, h: 0.55, y: 0.35, color: '#7a5a3a' },
  { box: { x: 112.4, z: 104.5, w: 1.64, d: 1.94 }, h: 0.24, y: 0.48, color: '#2a3238' },
]

// A family in a boat, going by west down Third: him at the motor, her, the boy, and the dog in the bow.
const familyBoat: readonly Prop[] = [
  { box: { x: 121, z: 105, w: 4.2, d: 1.4 }, h: 0.35, y: 0.15, color: '#8a8a7e' },
  { box: { x: 123.3, z: 105, w: 0.3, d: 0.35 }, h: 0.5, y: 0.35, color: '#3a3c3e' },
  ...person(122.6, 105, 0.3, '#4e5a66', 1.4),
  ...person(121.2, 105.2, 0.3, '#8a4a4a', 1.2),
  ...person(120.3, 104.8, 0.3, '#c9a73a', 0.9),
  { box: { x: 119.4, z: 105, w: 0.6, d: 0.25 }, h: 0.3, y: 0.45, color: '#4a3826' },
  { box: { x: 119.05, z: 105, w: 0.2, d: 0.2 }, h: 0.2, y: 0.65, color: '#4a3826' },
]

// Neighbors up on the roofs across Third and on the block, waiting it out.
const roofs: readonly Prop[] = [
  ...person(128, 113, 3.5, '#5a6578'),
  ...person(129, 113.4, 3.5, '#8a7a5c', 1.5),
  ...person(146, 112.6, 3.5, '#6b7a6e'),
  ...person(150, 90, 3.5, '#7a4a3a'),
]

// Fuel drums and boards adrift on Third and up Lacey.
const drift: readonly Prop[] = [
  ...[
    [126, 103],
    [104, 101.5],
    [95, 106],
    [83, 92],
    [79.5, 75],
  ].map(([x, z]): Prop => ({ box: { x: x!, z: z!, w: 0.6, d: 0.6 }, h: 0.5, y: 0.05, color: '#6a4030', shape: 'cylinder' })),
  ...[
    [138, 106, 2.4, 0.25],
    [117, 101.8, 0.25, 1.8],
    [99, 104, 3, 0.3],
    [84.5, 86, 0.3, 2.2],
  ].map(([x, z, w, d]): Prop => ({ box: { x: x!, z: z!, w: w!, d: d! }, h: 0.06, y: WATER_Y - 0.02, color: '#8a7656', flat: true })),
]

// The bar row's neon on Second, still on above the water: the Silver Pan, the Sluice Box, the Blue Spruce's blade
// sign on its Lacey corner.
const neon: readonly Prop[] = [
  { box: { x: 33, z: 48.2, w: 2.6, d: 0.1 }, h: 0.45, y: 3.4, color: '#e8604a', glow: true },
  { box: { x: 50, z: 48.2, w: 2.2, d: 0.1 }, h: 0.4, y: 3.2, color: '#7ac0d8', glow: true },
  { box: { x: 95, z: 48.2, w: 2.4, d: 0.1 }, h: 0.45, y: 4.2, color: '#5ad08a', glow: true },
  { box: { x: 87.8, z: 46, w: 0.1, d: 1.6 }, h: 1.0, y: 3.4, color: '#5ad08a', glow: true },
]

// The streetlight across Third from the door (lighting.ts keys its lamp here).
export const LAMP_AT = vec(128.9, 108.4)
export const LAMP_HEAD = 4

const lamp: readonly Prop[] = [
  { box: { x: LAMP_AT.x, z: LAMP_AT.z, w: 0.3, d: 0.3 }, h: LAMP_HEAD, color: '#3a3a3a' },
  { box: { x: LAMP_AT.x, z: LAMP_AT.z, w: 0.5, d: 0.3 }, h: 0.3, y: LAMP_HEAD, color: '#ffd28a', glow: true },
]

// The flood's layer over downtown: everything the flooded street adds to the July town.
export const highWater: readonly Prop[] = [sheet, ...banks, ...decks, ...pickup, ...familyBoat, ...roofs, ...drift, ...neon, ...lamp]

// Inside the boarding house that August: Owen's room upstairs is dry, rain on the window and the copies in his
// satchel on the bed; the ground floor is knee-deep, a chair and a crate afloat in the hall and the parlor.
export const HOUSE_WATER = 0.45

export const indoors: Readonly<Partial<Record<'room' | 'boarding', readonly Prop[]>>> = {
  room: [
    { box: { x: 0.6, z: -2.78, w: 1.02, d: 0.04 }, h: 1.12, y: 0.99, color: '#6f7c86', glow: true },
    { box: { x: -2.0, z: 0.9, w: 0.42, d: 0.3 }, h: 0.26, y: 0.55, color: '#5a4632' },
  ],
  boarding: [
    { box: { x: 0, z: 0, w: 16, d: 14 }, h: HOUSE_WATER, color: water, flat: true },
    { box: { x: -0.4, z: 2.2, w: 0.45, d: 0.45 }, h: 0.45, y: HOUSE_WATER - 0.12, color: '#4a3020' },
    { box: { x: -3.6, z: 5.0, w: 0.6, d: 0.45 }, h: 0.35, y: HOUSE_WATER - 0.1, color: '#8a7656' },
    { box: { x: -5.6, z: 1.6, w: 0.5, d: 0.5 }, h: 0.3, y: HOUSE_WATER - 0.08, color: '#6a4a5a' },
  ],
}

import type { Box, Interactable, Vec } from './world.ts'
import { vec } from './world.ts'
import type { Activity } from './cast.ts'
import type { Act, Place } from '../../text-game/src/types.ts'
import { N } from '../../text-game/src/names.ts'
import { CENTER, SIZE, doorSpots, gaps, pieces, spawnAt } from './downtown.ts'

export type SpaceId = 'bar' | 'boarding' | 'room' | 'camp' | 'flood' | 'line' | 'downtown' | 'story'

export type Season = 'summer' | 'flood'

export type Prop = Readonly<{
  box: Box
  h: number
  y?: number
  color: string
  solid?: boolean
  occludes?: boolean
  glow?: boolean
  flat?: boolean
  shape?: 'box' | 'cylinder' | 'cone'
  // Drawn only while the letter is in the typewriter, or only once it is folded and left by the door.
  while?: Letter
}>

export type Letter = 'unfolded' | 'folded'

export type Figure = Readonly<{
  id: string
  at: Vec
  facing: number
  coat: string
  skin: string
  hair: string
  height: number
  hood?: boolean
  activity?: Activity
  // The story place while which this figure stands in for its townsperson, so the town does not place them again;
  // the space's own place when it has one.
  during?: Place
}>

export type Space = Readonly<{
  id: SpaceId
  act?: Act
  place?: Place
  name: string
  back?: string
  season: Season
  size: Readonly<{ w: number; d: number }>
  center?: Vec
  interior: boolean
  ground: string
  spawn: Vec
  props: readonly Prop[]
  figures: readonly Figure[]
  spots: readonly Interactable[]
}>

const wall = (x: number, z: number, w: number, d: number, color: string, h = 3): Prop => ({
  box: { x, z, w, d },
  h,
  color,
  solid: true,
  occludes: true,
})

const walls = (w: number, d: number, color: string): readonly Prop[] => [
  wall(0, -d / 2, w, 0.3, color),
  wall(0, d / 2, w, 0.3, color),
  wall(-w / 2, 0, 0.3, d, color),
  wall(w / 2, 0, 0.3, d, color),
]

const edges = (w: number, d: number): readonly Prop[] => [
  { box: { x: 0, z: -d / 2 - 0.5, w: w + 2, d: 1 }, h: 0.01, color: '#000000', solid: true },
  { box: { x: 0, z: d / 2 + 0.5, w: w + 2, d: 1 }, h: 0.01, color: '#000000', solid: true },
  { box: { x: -w / 2 - 0.5, z: 0, w: 1, d: d + 2 }, h: 0.01, color: '#000000', solid: true },
  { box: { x: w / 2 + 0.5, z: 0, w: 1, d: d + 2 }, h: 0.01, color: '#000000', solid: true },
]

export const HIDE_TIME = 2.4

export const ROUND_TIME = 1.2

const owen = { skin: '#d9a982', hair: '#6b4a2e' }

export const bar: Space = {
  id: 'bar',
  act: 'Prologue',
  place: 'silverPan',
  back: 'Back to the table.',
  name: 'The Silver Pan',
  interior: true,
  season: 'summer',
  size: { w: 12, d: 10 },
  ground: '#5a3d2b',
  spawn: vec(0, 3.0),
  props: [
    ...walls(12, 10, '#7a5a3f'),
    { box: { x: -1.5, z: -3.3, w: 7, d: 0.9 }, h: 1.1, color: '#3e2618', solid: true, occludes: true },
    { box: { x: -1.5, z: -4.6, w: 8, d: 0.4 }, h: 2.2, color: '#4a2f1e', solid: true },
    { box: { x: -3, z: -4.55, w: 1.4, d: 0.3 }, h: 0.35, y: 1.6, color: '#c7a24a', glow: true },
    { box: { x: 0.5, z: -4.55, w: 1.4, d: 0.3 }, h: 0.35, y: 1.6, color: '#8fb7a0', glow: true },
    { box: { x: 5.85, z: -0.5, w: 0.1, d: 2.6 }, h: 1.6, y: 0.9, color: '#ffc27a', glow: true },
    { box: { x: 2.8, z: 1.2, w: 1.6, d: 1.6 }, h: 0.8, color: '#6e4a30', solid: true, shape: 'cylinder' },
    { box: { x: -4.2, z: 1.8, w: 1.3, d: 1.3 }, h: 0.8, color: '#6e4a30', solid: true, shape: 'cylinder' },
    { box: { x: 3.6, z: 2.3, w: 1.0, d: 0.35 }, h: 0.3, color: '#2b1d14' },
    { box: { x: 4.05, z: 0.85, w: 0.42, d: 0.42 }, h: 0.46, color: '#4a3020' },
    { box: { x: 2.55, z: 2.45, w: 0.42, d: 0.42 }, h: 0.46, color: '#4a3020' },
    { box: { x: 0, z: 4.45, w: 1.4, d: 0.7 }, h: 0.03, color: '#a8794a' },
  ],
  figures: [
    { id: 'hank', at: vec(-1.5, -4.0), facing: 0, coat: '#e8e1d2', skin: '#e0b48f', hair: '#9a9a9a', height: 1.8, activity: 'stand' },
    { id: 'curly', at: vec(3.9, 0.9), facing: -1.9, coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75, activity: 'sitDrink' },
    { id: 'wade', at: vec(2.6, 2.3), facing: 2.9, coat: '#5d7a8f', skin: '#efc49e', hair: '#5a3b22', height: 1.82, activity: 'sit' },
  ],
  spots: [
    { id: 'wade', x: 2.6, z: 2.3, r: 1.9, prompt: 'Talk to Wade' },
    { id: 'curly', x: 3.9, z: 0.9, r: 1.7, prompt: 'Talk to Curly' },
    { id: 'hank', x: -1.5, z: -2.6, r: 1.5, note: 'round', hold: ROUND_TIME },
    { id: 'door', x: 0, z: 4.4, r: 1.0, note: 'goodnight' },
  ],
}

// A wall along x at z, from x0 to x1, with the door gaps cut out (thickness 0.2).
const wallX = (z: number, x0: number, x1: number, color: string, doors: readonly (readonly [number, number])[] = []): readonly Prop[] =>
  gaps(x0, x1, doors).map(([a, b]) => wall((a + b) / 2, z, b - a, 0.2, color))

// A wall along z at x, from z0 to z1, with the door gaps cut out.
const wallZ = (x: number, z0: number, z1: number, color: string, doors: readonly (readonly [number, number])[] = []): readonly Prop[] =>
  gaps(z0, z1, doors).map(([a, b]) => wall(x, (a + b) / 2, 0.2, b - a, color))

// A closed door: a dark slab on a wall, at x or z.
const shutX = (x: number, z: number, color = '#3a2a1e'): Prop => ({ box: { x, z, w: 0.9, d: 0.24 }, h: 2.1, color })
const shutZ = (x: number, z: number, color = '#3a2a1e'): Prop => ({ box: { x, z, w: 0.24, d: 0.9 }, h: 2.1, color })

const plaster = '#9a8a70'
const papered = '#8f7b66'

// The stair rises south from its foot at the back of the hall (local z -1) to the landing over the front door.
const STEPS = 8
const stair: readonly Prop[] = Array.from({ length: STEPS }, (_, i): Prop => {
  const d = 7 / STEPS
  return { box: { x: 2.2, z: -0.5 + d * (i + 0.5), w: 1.8, d }, h: 0.35 * (i + 1), color: '#5e4430', solid: true, occludes: i > 3 }
})

// The ground floor of Owen's boarding house on Third (x 126..142, z 82..96 on the town map), as a gray box: the front
// door on Third, the hall with the pay phone, the landlady's parlor with the radio on, the shared bathroom at the
// back, and the stair up to Owen's room. Local x east, z south; the front door is at local (0, 7).
export const boarding: Space = {
  id: 'boarding',
  act: 'Prologue',
  name: 'The boarding house',
  interior: true,
  season: 'summer',
  size: { w: 16, d: 14 },
  ground: '#6b5641',
  spawn: vec(0, 6.2),
  props: [
    ...wallX(-7, -8, 8, plaster),
    ...wallX(7, -8, 8, plaster),
    ...wallZ(-8, -7, 7, plaster),
    ...wallZ(8, -7, 7, plaster),
    { box: { x: 0, z: 6.85, w: 1.0, d: 0.12 }, h: 2.1, color: '#2c2622' },
    // The parlor, west of the hall, open to it between z 2.5 and 4.5.
    ...wallZ(-1.2, -1, 7, papered, [[2.5, 4.5]]),
    ...wallX(-1, -8, -1.2, papered),
    // The kitchen behind it, shut.
    shutX(-4.6, -0.86),
    // The stair's east wall and the brakeman's room beyond it, shut.
    ...wallZ(3.2, -2, 7, papered),
    shutZ(3.34, 2.4),
    // The shared bathroom at the back, east of the hall, its door off the hall at z -4.5.
    ...wallX(-2, 1.2, 8, plaster),
    ...wallZ(1.2, -7, -2, plaster, [[-5, -4]]),
    { box: { x: 6.6, z: -5.9, w: 1.7, d: 0.8 }, h: 0.55, color: '#d8d4c8', solid: true },
    { box: { x: 4.0, z: -6.65, w: 0.55, d: 0.45 }, h: 0.85, color: '#d8d4c8', solid: true },
    { box: { x: 4.0, z: -6.9, w: 0.5, d: 0.04 }, h: 0.6, y: 1.2, color: '#b9c4c8' },
    { box: { x: 7.5, z: -3.0, w: 0.5, d: 0.65 }, h: 0.45, color: '#d8d4c8', solid: true },
    { box: { x: 5.2, z: -4.5, w: 0.15, d: 0.15 }, h: 0.1, y: 2.5, color: '#ffb877', glow: true },
    ...stair,
    // The hall: a runner, the mail table by the door, coat hooks, the pay phone on the parlor wall, the bulb.
    { box: { x: 0, z: 2.5, w: 1.0, d: 8.5 }, h: 0.01, color: '#6e2f2a', flat: true },
    { box: { x: -0.85, z: 5.4, w: 0.5, d: 0.9 }, h: 0.8, color: '#4a3020', solid: true },
    { box: { x: 0.95, z: 6.5, w: 0.2, d: 0.6 }, h: 0.8, y: 1.0, color: '#3e3226' },
    { box: { x: -1.04, z: 6.1, w: 0.12, d: 0.24 }, h: 0.42, y: 1.25, color: '#1e1e1e' },
    { box: { x: -1.0, z: 6.1, w: 0.16, d: 0.34 }, h: 0.04, y: 1.05, color: '#3e3226' },
    { box: { x: 0, z: 1.5, w: 0.15, d: 0.15 }, h: 0.1, y: 2.6, color: '#ffb877', glow: true },
    // The parlor: the radio on its table with the dial lit, her armchair, the sofa, a lamp, a rug.
    { box: { x: -7.4, z: 3.4, w: 0.7, d: 0.5 }, h: 0.7, color: '#4a3020', solid: true },
    { box: { x: -7.4, z: 3.4, w: 0.55, d: 0.32 }, h: 0.32, y: 0.7, color: '#7a4e2c' },
    { box: { x: -7.12, z: 3.4, w: 0.04, d: 0.2 }, h: 0.08, y: 0.85, color: '#ffc27a', glow: true },
    { box: { x: -5.2, z: 3.4, w: 0.8, d: 0.8 }, h: 0.9, color: '#6a4a5a', solid: true },
    { box: { x: -4.6, z: 6.4, w: 2.4, d: 0.8 }, h: 0.8, color: '#5a5048', solid: true },
    { box: { x: -7.4, z: 6.4, w: 0.4, d: 0.4 }, h: 1.4, color: '#3e3226' },
    { box: { x: -7.4, z: 6.4, w: 0.5, d: 0.5 }, h: 0.35, y: 1.4, color: '#ffc27a', glow: true },
    { box: { x: -4.4, z: 3.6, w: 3.2, d: 2.4 }, h: 0.01, color: '#7a5a3a', flat: true },
    { box: { x: -7.9, z: 1.6, w: 0.08, d: 1.2 }, h: 1.0, y: 1.0, color: '#ffd9a0', glow: true },
  ],
  figures: [
    { id: 'landlady', at: vec(-4.5, 3.4), facing: Math.PI / 2, coat: '#7b5e78', skin: '#e2b994', hair: '#b8b2a8', height: 1.6, during: 'owensRoom' },
    { id: 'boarder', at: vec(-3.0, 1.1), facing: -Math.PI / 2, coat: '#3e4a5a', skin: '#d8a880', hair: '#3a2c20', height: 1.78, during: 'owensRoom' },
  ],
  spots: [
    { id: 'landlady', x: -4.5, z: 3.4, r: 2.4, prompt: 'Say good evening' },
    { id: 'stair', x: 0.4, z: -0.6, r: 1.1, prompt: 'Go up to your room' },
  ],
}

// Owen's room, upstairs at the back of the house (x 131..137, z 82..88): the bed, the desk under the north window
// with the survey maps pinned either side of it, the typewriter, the reel-to-reel on the trunk, the theodolite case
// and the sample bags. The midnight sun comes through a thin curtain. The stair comes up at the door, local (0, 3).
export const DESK_AT = vec(0.6, -1.4)
export const BED_AT = vec(-1.1, 0.4)
export const TYPEWRITER_AT = vec(0.4, -2.45)
export const REEL_AT = vec(2.3, -2.3)

export const room: Space = {
  id: 'room',
  act: 'Prologue',
  place: 'owensRoom',
  name: "Owen's room",
  interior: true,
  season: 'summer',
  size: { w: 6, d: 6 },
  ground: '#6b5641',
  spawn: vec(0, 1.2),
  props: [
    ...walls(6, 6, '#8c7a62'),
    { box: { x: 0, z: 2.9, w: 0.9, d: 0.12 }, h: 2.1, color: '#3a2a1e' },
    // The bed and its pillow.
    { box: { x: -2.1, z: 0.4, w: 1.0, d: 2.0 }, h: 0.55, color: '#5d6f7f', solid: true },
    { box: { x: -2.1, z: -0.4, w: 0.7, d: 0.35 }, h: 0.12, y: 0.55, color: '#e6e0d0' },
    // The desk under the window, the chair, the typewriter and the sheet in it.
    { box: { x: 0.6, z: -2.45, w: 1.4, d: 0.7 }, h: 0.76, color: '#5b3e28', solid: true },
    { box: { x: 0.6, z: -1.75, w: 0.45, d: 0.45 }, h: 0.46, color: '#4a3020' },
    { box: { x: TYPEWRITER_AT.x, z: TYPEWRITER_AT.z, w: 0.45, d: 0.35 }, h: 0.16, y: 0.76, color: '#30302e' },
    { box: { x: TYPEWRITER_AT.x, z: TYPEWRITER_AT.z - 0.12, w: 0.3, d: 0.02 }, h: 0.22, y: 0.9, color: '#efe6cf', while: 'unfolded' },
    { box: { x: 1.0, z: -2.4, w: 0.3, d: 0.4 }, h: 0.06, y: 0.76, color: '#d9cfa8' },
    // The window behind a thin curtain, and the survey maps pinned either side: the route north, the Chatanika parcel.
    { box: { x: 0.6, z: -2.85, w: 1.0, d: 0.1 }, h: 1.1, y: 1.0, color: '#ffd9a0', glow: true },
    { box: { x: 0.0, z: -2.8, w: 0.15, d: 0.06 }, h: 1.3, y: 0.9, color: '#d8cdb0' },
    { box: { x: 1.2, z: -2.8, w: 0.15, d: 0.06 }, h: 1.3, y: 0.9, color: '#d8cdb0' },
    { box: { x: -0.65, z: -2.83, w: 0.8, d: 0.03 }, h: 0.6, y: 1.25, color: '#d9cfa8' },
    { box: { x: -0.65, z: -2.81, w: 0.04, d: 0.02 }, h: 0.5, y: 1.3, color: '#9a3b2b' },
    { box: { x: 1.85, z: -2.83, w: 0.7, d: 0.03 }, h: 0.55, y: 1.3, color: '#d9cfa8' },
    { box: { x: 1.95, z: -2.81, w: 0.12, d: 0.02 }, h: 0.1, y: 1.5, color: '#9a3b2b' },
    // The reel-to-reel on the trunk.
    { box: { x: REEL_AT.x, z: REEL_AT.z, w: 0.9, d: 0.6 }, h: 0.45, color: '#4a3b2a', solid: true },
    { box: { x: REEL_AT.x, z: REEL_AT.z, w: 0.5, d: 0.38 }, h: 0.14, y: 0.45, color: '#3a3a38' },
    { box: { x: REEL_AT.x - 0.12, z: REEL_AT.z, w: 0.2, d: 0.2 }, h: 0.03, y: 0.59, color: '#8a8a86', shape: 'cylinder' },
    { box: { x: REEL_AT.x + 0.12, z: REEL_AT.z, w: 0.2, d: 0.2 }, h: 0.03, y: 0.59, color: '#8a8a86', shape: 'cylinder' },
    // The theodolite case and the sample bags of gravel.
    { box: { x: 2.6, z: 0.3, w: 0.35, d: 0.3 }, h: 0.65, color: '#6b5a3a', solid: true },
    ...[
      [2.45, 1.45],
      [2.7, 1.85],
      [2.2, 1.95],
    ].map(([x, z]): Prop => ({ box: { x, z, w: 0.25, d: 0.2 }, h: 0.28, color: '#b9a77f' })),
    // The chair by the door, and the letter on it once it is folded.
    { box: { x: -1.2, z: 2.5, w: 0.45, d: 0.45 }, h: 0.46, color: '#5a3f2a', solid: true },
    { box: { x: -1.2, z: 2.5, w: 0.24, d: 0.11 }, h: 0.03, y: 0.46, color: '#efe6cf', while: 'folded' },
    { box: { x: 0, z: 0, w: 0.15, d: 0.15 }, h: 0.1, y: 2.6, color: '#ffb877', glow: true },
  ],
  figures: [],
  spots: [
    { id: 'desk', x: DESK_AT.x, z: DESK_AT.z, r: 1.2, prompt: `Write to ${N.lucy}` },
    { id: 'bed', x: BED_AT.x, z: BED_AT.z, r: 1.3, note: 'sleep' },
  ],
}

export const CURLY_AT = vec(-6.4, 5.4)

export const camp: Space = {
  id: 'camp',
  act: 'Prologue',
  place: 'surveyCamp',
  name: 'The survey camp',
  interior: false,
  season: 'summer',
  size: { w: 28, d: 24 },
  ground: '#6f7a4a',
  spawn: vec(-8.2, 3.6),
  props: [
    ...edges(28, 24),
    { box: { x: 0, z: 10, w: 28, d: 4 }, h: 0.05, color: '#4f6f78', solid: true },
    { box: { x: -9, z: 7.2, w: 1.1, d: 5.2 }, h: 1.2, y: 0.5, color: '#c9c2b0', solid: true, occludes: true },
    { box: { x: -9, z: 7.2, w: 7, d: 0.9 }, h: 0.12, y: 1.6, color: '#b13d2a' },
    { box: { x: -6.8, z: 6.6, w: 0.9, d: 0.9 }, h: 1.0, color: '#7a2a1c', solid: true, shape: 'cylinder' },
    { box: { x: 6, z: -2.4, w: 3.6, d: 3.0 }, h: 2.2, color: '#d8ceb0', solid: true, occludes: true, shape: 'box' },
    { box: { x: 6.9, z: -2.9, w: 0.25, d: 0.25 }, h: 1.6, y: 2.2, color: '#4a4a4a' },
    { box: { x: 9.2, z: 5.2, w: 1.8, d: 1.6 }, h: 1.2, y: 1.9, color: '#6a5034' },
    { box: { x: 8.5, z: 4.6, w: 0.2, d: 0.2 }, h: 1.9, color: '#5a4430' },
    { box: { x: 9.9, z: 4.6, w: 0.2, d: 0.2 }, h: 1.9, color: '#5a4430' },
    { box: { x: 8.5, z: 5.8, w: 0.2, d: 0.2 }, h: 1.9, color: '#5a4430' },
    { box: { x: 9.9, z: 5.8, w: 0.2, d: 0.2 }, h: 1.9, color: '#5a4430' },
    { box: { x: 1.8, z: -9.3, w: 0.25, d: 0.25 }, h: 1.3, color: '#d9c25a' },
    { box: { x: 1.8, z: -9.3, w: 2.4, d: 2.4 }, h: 0.4, color: '#7d7f5a', shape: 'cylinder' },
    ...[
      [-1, 1.5],
      [-5.5, -1.5],
      [2.6, -4.2],
      [3.4, -6.3],
      [-3.4, -3.6],
      [11.6, 1.6],
      [12, -7],
      [-11, -6.5],
      [-6.2, -8.6],
      [5.2, 7.4],
    ].map(([x, z]): Prop => ({
      box: { x, z, w: 1.4, d: 1.4 },
      h: 4,
      color: '#2f4a33',
      solid: true,
      occludes: true,
      shape: 'cone',
    })),
    ...[
      [-2.6, 1.8],
      [4, 2.2],
      [7.4, 1.8],
    ].map(([x, z]): Prop => ({
      box: { x, z, w: 2.2, d: 1.2 },
      h: 1.4,
      color: '#5b7a3a',
      solid: false,
      occludes: true,
    })),
  ],
  figures: [
    { id: 'curly', at: CURLY_AT, facing: -Math.PI / 2, coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75 },
  ],
  spots: [
    { id: 'stove', x: 5.6, z: -0.5, r: 1.1, note: 'stove', hold: HIDE_TIME },
    { id: 'cache', x: 9.2, z: 3.8, r: 1.1, note: 'cache', hold: HIDE_TIME },
    { id: 'marker', x: 1.8, z: -8.1, r: 1.1, note: 'marker', hold: HIDE_TIME },
    { id: 'plane', x: -7.6, z: 4.6, r: 1.6, prompt: 'Fly home with Curly' },
  ],
}

export const flood: Space = {
  id: 'flood',
  act: 'Prologue',
  place: 'boardingHouse',
  name: 'High water',
  interior: false,
  season: 'flood',
  size: { w: 20, d: 16 },
  ground: '#5b4a33',
  spawn: vec(0, 6.4),
  props: [
    ...edges(20, 16),
    { box: { x: 0, z: -1.5, w: 20, d: 13 }, h: 0.35, color: '#6b5a3c', solid: true },
    { box: { x: 0, z: 7.6, w: 6, d: 0.6 }, h: 0.9, color: '#8b7a62', solid: true, occludes: true },
    { box: { x: 1.4, z: 7.25, w: 1.1, d: 0.1 }, h: 0.5, y: 0.9, color: '#ffc27a', glow: true },
    { box: { x: -5, z: -1, w: 2, d: 4.2 }, h: 0.8, color: '#3e5a6e' },
    { box: { x: 6.5, z: -4.5, w: 0.3, d: 0.3 }, h: 4, color: '#3a3a3a' },
    { box: { x: 6.5, z: -4.5, w: 0.5, d: 0.3 }, h: 0.3, y: 4, color: '#ffd28a', glow: true },
    { box: { x: 0.2, z: 3.4, w: 1.4, d: 3.4 }, h: 0.45, y: 0.3, color: '#6a6f72' },
  ],
  figures: [
    { id: 'hooded', at: vec(0.2, 2.4), facing: Math.PI, coat: '#c9a73a', skin: '#c9a73a', hair: '#c9a73a', height: 1.8, hood: true },
  ],
  spots: [{ id: 'skiff', x: 0.2, z: 4.6, r: 1.4, prompt: 'Get in the skiff' }],
}

// Act 1 opens here as Wade: the sandbag line across Cushman, a piece of the flooded street like `flood`, laid out on
// the Act 1 audio bed (soundscape.ts): the bags along LINE_AT, the river's deep water past them to the north. The bags
// run east-west with a gap at the east curb, where he can step off the end of the line. The woman from Minto has
// stopped at him; the sergeant, behind the line, is looking the other way. Every floodedStreet scene of Act 1 plays
// here until the search for Eli builds the rest of the flooded downtown.
const airman = { coat: '#56603f', skin: '#d8ad88', hair: '#4a3626', height: 1.78 } as const

export const line: Space = {
  id: 'line',
  act: 'Act 1: Flood',
  place: 'floodedStreet',
  name: 'The sandbag line on Cushman',
  interior: false,
  season: 'flood',
  size: { w: 20, d: 16 },
  ground: '#4e4636',
  spawn: vec(0.7, -1.2),
  props: [
    ...edges(20, 16),
    wall(-8.5, 0, 3, 16, '#7d6a52', 5),
    wall(8.5, 0, 3, 16, '#6e6a5e', 4),
    { box: { x: -1.5, z: -3, w: 11, d: 0.7 }, h: 0.6, color: '#8a7a5a', solid: true },
    { box: { x: -1.5, z: -3, w: 10.6, d: 0.5 }, h: 0.25, y: 0.6, color: '#9a8a68', solid: true },
    { box: { x: 0, z: -7, w: 14, d: 6 }, h: 0.02, color: '#3e3a30', flat: true },
    { box: { x: 3.5, z: -6.2, w: 2.0, d: 4.4 }, h: 1.1, color: '#4a5a3a', solid: true, occludes: true },
    { box: { x: -6.6, z: 2.5, w: 0.3, d: 0.3 }, h: 4, color: '#3a3a3a' },
    { box: { x: -6.6, z: 2.5, w: 0.5, d: 0.3 }, h: 0.3, y: 4, color: '#ffd28a', glow: true },
  ],
  figures: [
    { id: 'woman', at: vec(1.9, -2.1), facing: -0.93, coat: '#3d4038', skin: '#a8754f', hair: '#1e1a17', height: 1.6 },
    { id: 'sergeant', at: vec(-3.2, 1.8), facing: -Math.PI / 2, ...airman, coat: '#4a5236', height: 1.8 },
    { id: 'airman1', at: vec(-0.8, -2.2), facing: Math.PI / 2, ...airman },
    { id: 'airman2', at: vec(-2.3, -2.2), facing: Math.PI / 2, ...airman, hair: '#7a5a34' },
    { id: 'airman3', at: vec(-3.8, -2.2), facing: Math.PI / 2, ...airman, skin: '#8a5d3d', hair: '#1c1a18' },
  ],
  spots: [{ id: 'woman', x: 1.9, z: -2.1, r: 1.9, prompt: 'Hear her out' }],
}

// Downtown in world coordinates off docs/town-map.md (see downtown.ts). No story place routes here: the prologue's
// walks start here when the story moves to a place downtown reaches on foot, and end at its door.
const secondAve = spawnAt('secondAve')

export const downtown: Space = {
  id: 'downtown',
  act: 'Prologue',
  name: 'Downtown Fairbanks',
  interior: false,
  season: 'summer',
  size: SIZE,
  center: CENTER,
  ground: '#6c665a',
  spawn: vec(secondAve.x, secondAve.z),
  props: pieces,
  figures: [],
  spots: doorSpots,
}

// The backdrop for a scene that has no space yet, outside any act: its menu plays as a panel here, with no player in
// the world, until a scene's place has a space.
export const story: Space = {
  id: 'story',
  name: 'Second Rush',
  interior: true,
  season: 'summer',
  size: { w: 8, d: 8 },
  ground: '#16181d',
  spawn: vec(0, 0),
  props: edges(8, 8),
  figures: [],
  spots: [],
}

export const spaces: Readonly<Record<SpaceId, Space>> = { bar, boarding, room, camp, flood, line, downtown, story }

export const centerOf = (s: Space): Vec => s.center ?? vec(0, 0)

export const owenLook = owen

export const FIGURE_WIDTH = 0.5

export const figureBox = (f: Figure): Box => ({ x: f.at.x, z: f.at.z, w: FIGURE_WIDTH, d: FIGURE_WIDTH })

export const solids = (s: Space): readonly Box[] => [...s.props.filter((p) => p.solid).map((p) => p.box), ...s.figures.map(figureBox)]

export const occluders = (s: Space): readonly Box[] => s.props.filter((p) => p.occludes).map((p) => p.box)

const TURN = 0.9
export const WORK = 4.6
const SWEEP = 2.8
export const CURLY_PERIOD = WORK + TURN + SWEEP + TURN

const atPlane = -Math.PI / 2
const sweepFrom = Math.PI / 2 - 0.85
const sweepTo = Math.PI / 2 + 0.85

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k

export const curlyFacing = (t: number): number => {
  const u = ((t % CURLY_PERIOD) + CURLY_PERIOD) % CURLY_PERIOD
  if (u < WORK) return atPlane + 0.15 * Math.sin(u * 2.1)
  if (u < WORK + TURN) return lerp(atPlane, sweepFrom, (u - WORK) / TURN)
  if (u < WORK + TURN + SWEEP) return lerp(sweepFrom, sweepTo, (u - WORK - TURN) / SWEEP)
  return lerp(sweepTo, atPlane + 2 * Math.PI, (u - WORK - TURN - SWEEP) / TURN)
}

export const CURLY_RANGE = 19
export const CURLY_HALF_ANGLE = 0.55

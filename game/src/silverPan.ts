import type { State } from '../../text-game/src/types.ts'
import type { Figure, Prop } from './levels.ts'
import type { Pose } from './ambient.ts'
import { lookOf, poses } from './ambient.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

// The Silver Pan, full (issue #46): the dressing that makes the bar read as a 1967 Fairbanks bar at 11 pm in July, and
// the look of the patrons the ambient schedule seats in it (ambient.ts). Everything here is in the bar space's own
// meters (levels.ts): x east, z south, the counter along the north wall at z -3.3 from x -5 to 2, the door at (0, 4.4).
// Gray-box primitives only, so there is no third-party art (docs/art/assets.md). The neon and the tin signs are for
// made-up brands and carry no lettering.
//
// This file imports levels.ts for types only: levels.ts can spread `dressing` into the bar's props without a cycle.

// Where the room's activities are, for the slots in ambient.ts and the interactions in barTalk.ts.
export const POOL_TABLE: Vec = vec(-3.9, -0.9)
export const CARD_TABLE: Vec = vec(-4.2, 1.8)
export const BOOTH: Vec = vec(4.9, 3.6)
export const JUKEBOX: Vec = vec(5.55, -0.5)
// The free stool Owen sits on to order, one down from Hank's taps.
export const ORDER_STOOL: Vec = vec(-0.5, -2.35)
export const STOOL_XS: readonly number[] = [-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5]
export const STOOL_Z = -2.35

const brass = '#b8913e'
const darkWood = '#3a2416'

const flat = (x: number, z: number, w: number, d: number, color: string): Prop => ({ box: { x, z, w, d }, h: 0.02, color, flat: true })

// On a wall: a thin slab at height y, h tall.
const hung = (x: number, z: number, w: number, d: number, y: number, h: number, color: string, glow?: true): Prop => ({
  box: { x, z, w, d },
  h,
  y,
  color,
  ...(glow ? { glow } : {}),
})

const bottleColors = ['#7a4a1c', '#3d5a34', '#c9c2a8', '#5a2a1c']

// The dressing, piece by piece, named the way the ticket lists it.
export const pieces: Readonly<Record<string, readonly Prop[]>> = {
  // The long bar: a dark top with a lip, and the brass foot rail along its front.
  bar: [{ box: { x: -1.5, z: -3.3, w: 7.2, d: 1.0 }, h: 0.06, y: 1.1, color: '#2a1a10' }],
  brassRail: [{ box: { x: -1.5, z: -2.78, w: 7.0, d: 0.06 }, h: 0.06, y: 0.22, color: brass }],
  // The back bar: a shelf, the mirror behind it, a row of bottles, and the gold pans along the top.
  backBar: [{ box: { x: -1.5, z: -4.3, w: 7.6, d: 0.25 }, h: 0.05, y: 0.95, color: darkWood }],
  mirror: [hung(-1.25, -4.39, 3.0, 0.02, 1.0, 0.55, '#b9c3c6')],
  bottles: Array.from({ length: 22 }, (_, i): Prop => ({
    box: { x: -4.8 + i * 0.3, z: -4.28, w: 0.09, d: 0.09 },
    h: 0.28 + (i % 3) * 0.04,
    y: 1.0,
    color: bottleColors[i % bottleColors.length],
    shape: 'cylinder',
  })),
  goldPans: Array.from({ length: 6 }, (_, i): Prop => ({
    box: { x: -4.6 + i * 1.25, z: -4.6, w: 0.44, d: 0.44 },
    h: 0.05,
    y: 2.2,
    color: i % 2 ? '#9a8656' : '#8c7a52',
    shape: 'cylinder',
  })),
  // The till at the east end, and the taps where the second bartender stands.
  till: [{ box: { x: 1.45, z: -3.35, w: 0.45, d: 0.35 }, h: 0.32, y: 1.16, color: '#7d6a48' }],
  taps: [-4.05, -3.8, -3.55].map((x): Prop => ({ box: { x, z: -3.55, w: 0.06, d: 0.06 }, h: 0.26, y: 1.16, color: '#d7d2c4', shape: 'cylinder' })),
  // Stools: seats people sit on, so not solid.
  stools: STOOL_XS.map((x): Prop => ({ box: { x, z: STOOL_Z, w: 0.38, d: 0.38 }, h: 0.7, color: '#5a2a20', shape: 'cylinder' })),
  // A moose rack over the door.
  mooseRack: [hung(0, 4.78, 0.3, 0.2, 2.3, 0.35, '#6b5640'), hung(-0.55, 4.8, 0.7, 0.08, 2.45, 0.35, '#d8c8a4'), hung(0.55, 4.8, 0.7, 0.08, 2.45, 0.35, '#d8c8a4')],
  // Photographs of dredges and riverboats, in dark frames, on the south and west walls.
  photos: [...[-4.2, -3.3, 3.2, 4.1].map((x) => hung(x, 4.82, 0.55, 0.03, 1.55, 0.42, '#6a5a46')), ...[-3.6, 0.2].map((z) => hung(-5.83, z, 0.03, 0.6, 1.6, 0.45, '#6a5a46'))],
  // The neon over the jukebox's corner, for a beer that never existed, and two tin signs.
  neon: [hung(4.4, -4.82, 1.1, 0.05, 2.2, 0.32, '#e0602a', true)],
  tinSigns: [hung(-5.82, -2.6, 0.03, 0.7, 1.7, 0.5, '#7a3b2a'), hung(5.82, 2.0, 0.03, 0.6, 1.7, 0.45, '#3e5a6b')],
  // The jukebox against the east wall, lit from the front.
  jukebox: [
    { box: { x: JUKEBOX.x, z: JUKEBOX.z, w: 0.55, d: 0.9 }, h: 1.45, color: '#6b3b26', solid: true },
    { box: { x: JUKEBOX.x, z: JUKEBOX.z, w: 0.55, d: 0.9 }, h: 0.18, y: 1.45, color: '#8a5a32', shape: 'cylinder' },
    hung(JUKEBOX.x - 0.29, JUKEBOX.z, 0.04, 0.7, 0.7, 0.5, '#ffcf7a', true),
  ],
  // The pool table under its hanging lamp.
  poolTable: [
    { box: { x: POOL_TABLE.x, z: POOL_TABLE.z, w: 2.2, d: 1.2 }, h: 0.78, color: '#3a2414', solid: true },
    { box: { x: POOL_TABLE.x, z: POOL_TABLE.z, w: 2.0, d: 1.0 }, h: 0.02, y: 0.78, color: '#2f5a3c', flat: true },
  ],
  hangingLamp: [
    hung(POOL_TABLE.x, POOL_TABLE.z, 0.02, 0.02, 2.4, 0.6, '#1e1a16'),
    { box: { x: POOL_TABLE.x, z: POOL_TABLE.z, w: 0.6, d: 0.6 }, h: 0.3, y: 2.1, color: '#3f4a3a', shape: 'cone' },
    hung(POOL_TABLE.x, POOL_TABLE.z, 0.24, 0.24, 2.06, 0.06, '#ffe2a0', true),
  ],
  // The card game in progress on the free table: the pot, a deck, and the two hands.
  cardTable: [
    { ...flat(CARD_TABLE.x, CARD_TABLE.z, 0.22, 0.16, '#e8e1d2'), y: 0.8 },
    { ...flat(CARD_TABLE.x + 0.2, CARD_TABLE.z - 0.1, 0.09, 0.13, '#e8e1d2'), y: 0.8 },
    { ...flat(CARD_TABLE.x, CARD_TABLE.z - 0.45, 0.3, 0.12, '#e8e1d2'), y: 0.8 },
    { ...flat(CARD_TABLE.x, CARD_TABLE.z + 0.45, 0.3, 0.12, '#e8e1d2'), y: 0.8 },
  ],
  // The dartboard on the north wall east of the back bar.
  dartboard: [hung(3.0, -4.82, 0.46, 0.04, 1.5, 0.46, '#2a2a24'), hung(3.0, -4.79, 0.2, 0.04, 1.63, 0.2, '#a83a2a')],
  // The booth in the southeast corner: a table between two benches with high backs.
  booth: [
    { box: { x: BOOTH.x, z: BOOTH.z, w: 0.9, d: 0.8 }, h: 0.75, color: '#4a3020', solid: true },
    { box: { x: BOOTH.x, z: 4.45, w: 1.4, d: 0.5 }, h: 0.45, color: '#5a2a22' },
    { box: { x: BOOTH.x, z: 4.78, w: 1.4, d: 0.12 }, h: 1.1, color: '#4a2a1e', solid: true },
    { box: { x: BOOTH.x, z: 2.75, w: 1.4, d: 0.5 }, h: 0.45, color: '#5a2a22' },
    { box: { x: BOOTH.x, z: 2.45, w: 1.4, d: 0.12 }, h: 1.1, color: '#4a2a1e', solid: true, occludes: true },
  ],
  // The oil stove in the southwest corner and its pipe.
  oilStove: [
    { box: { x: -5.2, z: 4.1, w: 0.7, d: 0.7 }, h: 0.9, color: '#2e2a26', solid: true, shape: 'cylinder' },
    { box: { x: -5.2, z: 4.1, w: 0.15, d: 0.15 }, h: 1.9, y: 0.9, color: '#262320', shape: 'cylinder' },
  ],
  // The coat hooks west of the door, heavy with jackets, and the pay phone east of it.
  coatHooks: [
    hung(-2.2, 4.8, 1.6, 0.06, 1.75, 0.06, darkWood),
    ...([
      [-2.8, '#6b3a2a'],
      [-2.25, '#4a5a3a'],
      [-1.7, '#7a6a4a'],
    ] as const).map(([x, c]) => hung(x, 4.7, 0.45, 0.18, 0.95, 0.8, c)),
  ],
  payPhone: [hung(1.6, 4.78, 0.3, 0.2, 1.2, 0.55, '#2a2a2a')],
  // A scuffed wood floor: sawdust along the bar and plank seams.
  floor: [flat(-1.5, -2.2, 7.0, 0.8, '#8a6a44'), ...Array.from({ length: 9 }, (_, i) => flat(0, -4 + i, 11.6, 0.03, '#46301f'))],
  // Windows on the west wall, and the low sun they lay on the boards.
  windows: [
    hung(-5.84, -1.0, 0.05, 1.2, 1.0, 1.1, '#ffcf8a', true),
    hung(-5.84, 2.6, 0.05, 1.2, 1.0, 1.1, '#ffcf8a', true),
    flat(-4.9, 0.4, 1.0, 1.4, '#c98d55'),
    flat(-4.7, 3.7, 0.9, 1.2, '#c98d55'),
  ],
}

export const dressing: readonly Prop[] = Object.values(pieces).flat()

// What each patron is doing, by their slot, for the poses and the tests: the slots are ambient.ts's.
export type Doing = 'tending' | 'cards' | 'pool' | 'jukebox' | 'booth' | 'asleep' | 'drinking'

export const doingAt = (slot: string): Doing => {
  const kind = slot.replace(/^silverPan\./, '').split('.')[0].replace(/\d+$/, '')
  const by: Readonly<Record<string, Doing>> = { tap: 'tending', table: 'cards', pool: 'pool', jukebox: 'jukebox', booth: 'booth', end: 'asleep' }
  return by[kind] ?? 'drinking'
}

// The patrons the schedule seats in the bar now, as figures the renderer can stand: one per placed pose, wearing
// their look, at their slot. They are the ambient people, not the space's own figures, so they never block the
// player and ambient.ts keeps placing them.
export const patrons = (s: State, seed: number): readonly Figure[] =>
  poses(s, seed, 0)
    .filter((p: Pose) => p.space === 'bar')
    .map((p) => ({ id: p.who, at: p.at, facing: p.yaw, activity: p.activity, ...lookOf(p.who) }))

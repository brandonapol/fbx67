import type { Figure, Prop, Space } from './levels.ts'
import type { Vec } from './world.ts'
import { distance, vec } from './world.ts'

// The land office on Second, the morning after the water peaked (place `landOffice`; docs/town-map.md, a 14 m lot,
// two floors, its door on Second at the north). Local x east, z south. The ground floor has 0.30 m of river in it
// (the town map's flood table); Lucy is hauling the wet ledgers up the staircase on the east wall to the dry floor
// above. Wade comes in the front door behind Eli.
//
// What the scene says comes from the story's menu. The ledgers in Wade's hands and the cigarette are the game's own:
// they send no note and change no state the story keeps.

const W = 12
const D = 10

// The ground floor's water line: thirty centimetres, flat across the room.
export const WATER = 0.3

export const SPAWN = vec(0, -4.1)
export const SPAWN_FACING = 0

// The staircase runs up the east wall from the room toward the back, STEPS treads of RISE each to the dry floor.
export const STAIR_X = 4.6
const STEPS = 10
const RISE = 0.3
const TREAD = 0.5
const STAIR_FOOT_Z = -1.6

export const LUCY_AT = vec(STAIR_X, -2.3)
export const PILE_AT = vec(-3.5, -1.6)

// How close Lucy has to be to take a lit cigarette out of Wade's mouth: as close as she is to talk to.
export const LUCY_REACH = 1.6

export const takesIt = (pos: Vec): boolean => distance(pos, LUCY_AT) <= LUCY_REACH

// What Wade can reach for, by what is in his hands: a ledger off the pile, or the one he carries handed up to Lucy.
// She talks to him with his hands empty.
export const officeSpot = (carrying: boolean, id: string): boolean => (id === 'handLedger') === carrying

const wall = (x: number, z: number, w: number, d: number, color: string): Prop => ({
  box: { x, z, w, d },
  h: 3.2,
  color,
  solid: true,
  occludes: true,
})

const plaster = '#a49c88'
const oak = '#5a4630'
const ledger = '#5b3a2a'
const DOOR = 1.2

const stair: readonly Prop[] = [
  ...Array.from({ length: STEPS }, (_, i): Prop => ({
    box: { x: STAIR_X, z: STAIR_FOOT_Z + TREAD * (i + 0.5), w: 1.2, d: TREAD },
    h: RISE * (i + 1),
    color: oak,
    solid: true,
  })),
  // The dry floor the stair comes up to, and its rail.
  { box: { x: STAIR_X - 0.4, z: STAIR_FOOT_Z + TREAD * STEPS + 0.7, w: 2.6, d: 1.4 }, h: 0.15, y: RISE * STEPS, color: '#6b5a42' },
  { box: { x: STAIR_X - 0.62, z: STAIR_FOOT_Z + (TREAD * STEPS) / 2, w: 0.06, d: TREAD * STEPS }, h: 0.06, y: RISE * STEPS * 0.55 + 0.9, color: '#3e2f20' },
  // Ledgers already carried up, stacked on the treads where she sets them down.
  { box: { x: STAIR_X + 0.3, z: STAIR_FOOT_Z + TREAD * 3.5, w: 0.4, d: 0.32 }, h: 0.14, y: RISE * 4, color: ledger },
  { box: { x: STAIR_X + 0.3, z: STAIR_FOOT_Z + TREAD * 6.5, w: 0.4, d: 0.32 }, h: 0.2, y: RISE * 7, color: ledger },
]

const pile: readonly Prop[] = [
  { box: { x: PILE_AT.x, z: PILE_AT.z, w: 1.0, d: 0.8 }, h: 0.5, color: '#4e3426', solid: true },
  { box: { x: PILE_AT.x + 0.1, z: PILE_AT.z - 0.05, w: 0.5, d: 0.36 }, h: 0.18, y: 0.5, color: ledger },
  { box: { x: PILE_AT.x - 0.2, z: PILE_AT.z + 0.15, w: 0.45, d: 0.34 }, h: 0.12, y: 0.68, color: '#6a4632' },
]

const figures: readonly Figure[] = [
  { id: 'lucy', at: LUCY_AT, facing: -1.3, coat: '#6a3b33', skin: '#a8754f', hair: '#16130f', height: 1.62 },
  { id: 'eli', at: vec(-1.8, -3.6), facing: 1.37, coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 },
]

export const office: Space = {
  id: 'office',
  act: 'Act 1: Flood',
  place: 'landOffice',
  name: 'The land office',
  interior: true,
  size: { w: W, d: D },
  ground: '#4a4234',
  spawn: SPAWN,
  props: [
    wall(-(W / 2 + DOOR / 2) / 2, -D / 2, W / 2 - DOOR / 2, 0.3, plaster),
    wall((W / 2 + DOOR / 2) / 2, -D / 2, W / 2 - DOOR / 2, 0.3, plaster),
    wall(0, D / 2, W, 0.3, plaster),
    wall(-W / 2, 0, 0.3, D, plaster),
    wall(W / 2, 0, 0.3, D, plaster),
    // Second Avenue through the open door, so the room does not end in black.
    { box: { x: 0, z: -D / 2 - 0.6, w: DOOR + 0.6, d: 0.6 }, h: 0.02, color: '#6c665a', flat: true },
    // The public counter, the shelves the ledgers came off, a file cabinet, the clerk's desk behind the counter.
    { box: { x: -2.1, z: 0.6, w: 7.2, d: 0.7 }, h: 1.05, color: oak, solid: true, occludes: true },
    { box: { x: -5.6, z: 1.5, w: 0.5, d: 5.4 }, h: 2.4, color: '#4e3f2c', solid: true, occludes: true },
    { box: { x: 1.0, z: 3.9, w: 0.9, d: 0.7 }, h: 1.4, color: '#6e706a', solid: true },
    { box: { x: -2.5, z: 2.8, w: 1.6, d: 0.8 }, h: 0.76, color: '#4e3826', solid: true },
    ...stair,
    ...pile,
    // The river in the room, flat at the water line, and the window light off Second.
    { box: { x: 0, z: 0, w: W - 0.3, d: D - 0.3 }, h: 0.02, y: WATER - 0.02, color: '#4f5446', flat: true },
    { box: { x: 3.4, z: -D / 2 + 0.2, w: 1.6, d: 0.08 }, h: 1.2, y: 0.9, color: '#d8d4c4', glow: true },
    // The cigarette Lucy dropped, floating where she let go of it.
    { box: { x: LUCY_AT.x - 0.5, z: LUCY_AT.z + 0.3, w: 0.08, d: 0.02 }, h: 0.02, y: WATER + 0.01, color: '#f2efe6', while: 'doused' },
  ],
  figures,
  spots: [
    { id: 'ledgers', x: PILE_AT.x, z: PILE_AT.z, r: 1.5, prompt: 'Pick up a wet ledger' },
    { id: 'lucy', x: LUCY_AT.x, z: LUCY_AT.z, r: LUCY_REACH, prompt: 'Talk to Lucy' },
    { id: 'handLedger', x: LUCY_AT.x, z: LUCY_AT.z, r: LUCY_REACH, prompt: 'Hand Lucy the ledger' },
  ],
}

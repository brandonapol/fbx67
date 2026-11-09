import type { State } from '../../text-game/src/types.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

// The Fairbanks PD city jail, the morning after the barfight (place `cityJail`, off the walkable town map): the
// drunk tank on the west side behind a wall of bars, the front desk on the east, the corridor door at the south.
// Local x east, z south. Wade wakes on the cell floor; Barnette comes to the bars; once Wade has answered him he is
// let out to the desk side, where Ashby is talking Barnette down.
//
// What the scene says comes from the story's menu. What the room shows comes from the state the story keeps: the
// barfight answer (`barfight`) is set by decision 1 and is all this file reads.

const W = 10
const D = 8

// The bars run north-south at BARS_X; the cell is everything west of them.
export const BARS_X = -1.5

export const CELL_SPAWN = vec(-3.6, 1.4)

// Where Wade stands once he is let out, by the cell door, facing the desk.
export const LET_OUT_AT = vec(-0.4, 1.6)
export const LET_OUT_FACING = Math.PI * 0.6

export const BARNETTE_AT_BARS = vec(-0.85, 0.2)
export const ASHBY_AT = vec(2.0, -0.5)

// Wade has answered Barnette: decision 1 is made.
export const answered = (s: State): boolean => s.barfight !== undefined

// The text's variants by Wade's answer, as the room shows them: Eli stays in the cell when Wade blamed him, and
// Curly is at Wade's shoulder on the way out when Wade sided with him.
const eliStays = (s: State): boolean => s.barfight === 'blameEli'
const curlyClaps = (s: State): boolean => s.barfight === 'sideCurly'

export const inCell = (p: Vec): boolean => p.x < BARS_X

// The pose Wade is let out to: once he has answered, while he is still in the cell.
export const letOut = (s: State, p: Vec): Readonly<{ at: Vec; facing: number }> | undefined =>
  answered(s) && inCell(p) ? { at: LET_OUT_AT, facing: LET_OUT_FACING } : undefined

const wall = (x: number, z: number, w: number, d: number, color: string): Prop => ({
  box: { x, z, w, d },
  h: 3,
  color,
  solid: true,
  occludes: true,
})

const block = '#8c8c80'
const iron = '#2e2f30'
const POSTS = 28

const bars: readonly Prop[] = [
  // The posts are drawn; the floor rail under them is what stops a man.
  ...Array.from({ length: POSTS }, (_, i): Prop => ({
    box: { x: BARS_X, z: -D / 2 + (D / POSTS) * (i + 0.5), w: 0.05, d: 0.05 },
    h: 2.6,
    color: iron,
    shape: 'cylinder',
  })),
  { box: { x: BARS_X, z: 0, w: 0.14, d: D }, h: 0.06, color: iron, solid: true },
  { box: { x: BARS_X, z: 0, w: 0.1, d: D }, h: 0.08, y: 2.6, color: iron },
  { box: { x: BARS_X, z: 0, w: 0.08, d: D }, h: 0.06, y: 1.1, color: iron },
]

const police = { coat: '#27304a', skin: '#e0b48f', hair: '#3a2c20', height: 1.85 } as const
const eli = { coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 } as const

const figures: readonly Figure[] = [
  { id: 'barnette', at: BARNETTE_AT_BARS, facing: -Math.PI / 2, ...police, when: (s) => !answered(s) },
  { id: 'barnetteDesk', at: vec(3.2, -2.4), facing: 0, ...police, when: answered },
  { id: 'ashby', at: ASHBY_AT, facing: -Math.PI / 2, coat: '#3b3a3e', skin: '#e6c0a0', hair: '#9a9590', height: 1.8, when: answered },
  { id: 'eli', at: vec(-2.6, -2.9), facing: Math.PI / 2, ...eli, activity: 'sit', when: (s) => !answered(s) || eliStays(s) },
  { id: 'eliOut', at: vec(0.4, 3.2), facing: Math.PI, ...eli, when: (s) => answered(s) && !eliStays(s) },
  { id: 'curly', at: vec(-4.3, -1.6), facing: Math.PI / 2, coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75, activity: 'sit', when: (s) => !curlyClaps(s) },
  { id: 'curlyOut', cast: 'curly', at: vec(-0.9, 2.4), facing: -0.6, coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75, when: curlyClaps },
]

export const jail: Space = {
  id: 'jail',
  act: 'Act 1: Flood',
  place: 'cityJail',
  name: 'The city jail',
  interior: true,
  size: { w: W, d: D },
  ground: '#5e5d58',
  spawn: CELL_SPAWN,
  props: [
    wall(0, -D / 2, W, 0.3, block),
    wall(0, D / 2, W, 0.3, block),
    wall(-W / 2, 0, 0.3, D, block),
    wall(W / 2, 0, 0.3, D, block),
    ...bars,
    // The cell: the bench along the west wall, the drain, the radiator by the bars, one bulb in a cage.
    { box: { x: -4.5, z: -0.5, w: 0.6, d: 5 }, h: 0.45, color: '#6a5a44', solid: true },
    { box: { x: -3.2, z: 1.0, w: 0.3, d: 0.3 }, h: 0.01, color: '#2a2a28', flat: true },
    { box: { x: -1.85, z: -1.6, w: 0.25, d: 1.0 }, h: 0.7, color: '#7a7a72', solid: true },
    { box: { x: -3.2, z: -0.5, w: 0.15, d: 0.15 }, h: 0.1, y: 2.6, color: '#ffe0b0', glow: true },
    // The front desk and its chair, the charge sheets, the lamp; the corridor door at the south.
    { box: { x: 3.2, z: -1.5, w: 2.8, d: 0.8 }, h: 1.05, color: '#4e3826', solid: true, occludes: true },
    { box: { x: 3.2, z: -2.6, w: 0.5, d: 0.5 }, h: 0.46, color: '#3a2a1e', solid: true },
    { box: { x: 2.7, z: -1.5, w: 0.3, d: 0.22 }, h: 0.01, y: 1.05, color: '#efe6cf' },
    { box: { x: 4.1, z: -1.6, w: 0.2, d: 0.2 }, h: 0.35, y: 1.05, color: '#ffc27a', glow: true },
    { box: { x: 0.6, z: D / 2 - 0.15, w: 1.0, d: 0.12 }, h: 2.1, color: '#3a3a36' },
    { box: { x: 2, z: 0.5, w: 0.15, d: 0.15 }, h: 0.1, y: 2.6, color: '#ffe0b0', glow: true },
  ],
  figures,
  spots: [
    { id: 'barnette', x: BARNETTE_AT_BARS.x, z: BARNETTE_AT_BARS.z, r: 1.5, prompt: 'Go to the bars' },
    { id: 'ashby', x: ASHBY_AT.x, z: ASHBY_AT.z, r: 1.9, prompt: 'Talk to the man at the desk' },
  ],
}

// Barnette at the bars until Wade has answered him; the man at the desk after.
export const jailSpot = (s: State, id: string): boolean => (id === 'barnette') !== answered(s)

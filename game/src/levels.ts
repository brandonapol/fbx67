import type { Box, Interactable, Vec } from './world.ts'
import { vec } from './world.ts'

export type SpaceId = 'bar' | 'room' | 'camp' | 'flood'

export type Season = 'summer' | 'flood'

export type Prop = Readonly<{
  box: Box
  h: number
  y?: number
  color: string
  solid?: boolean
  occludes?: boolean
  glow?: boolean
  shape?: 'box' | 'cylinder' | 'cone'
}>

export type Figure = Readonly<{
  id: string
  at: Vec
  facing: number
  coat: string
  skin: string
  hair: string
  height: number
  hood?: boolean
}>

export type Space = Readonly<{
  id: SpaceId
  name: string
  season: Season
  size: Readonly<{ w: number; d: number }>
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
    { box: { x: 0, z: 4.45, w: 1.4, d: 0.7 }, h: 0.03, color: '#a8794a' },
  ],
  figures: [
    { id: 'hank', at: vec(-1.5, -4.0), facing: 0, coat: '#e8e1d2', skin: '#e0b48f', hair: '#9a9a9a', height: 1.8 },
    { id: 'curly', at: vec(3.9, 0.9), facing: -1.9, coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75 },
    { id: 'wade', at: vec(2.6, 2.3), facing: 2.9, coat: '#5d7a8f', skin: '#efc49e', hair: '#5a3b22', height: 1.82 },
  ],
  spots: [
    { id: 'wade', x: 2.6, z: 2.3, r: 1.9, prompt: 'Talk to Wade' },
    { id: 'curly', x: 3.9, z: 0.9, r: 1.7, prompt: 'Talk to Curly' },
    { id: 'hank', x: -1.5, z: -2.6, r: 1.5, note: 'round', hold: ROUND_TIME },
    { id: 'door', x: 0, z: 4.4, r: 1.0, note: 'goodnight' },
  ],
}

export const room: Space = {
  id: 'room',
  name: "Owen's room",
  interior: true,
  season: 'summer',
  size: { w: 6, d: 6 },
  ground: '#6b5641',
  spawn: vec(0, 1.2),
  props: [
    ...walls(6, 6, '#8c7a62'),
    { box: { x: -1.8, z: -1.6, w: 1.6, d: 2.4 }, h: 0.6, color: '#5d6f7f', solid: true },
    { box: { x: 1.9, z: -2.2, w: 1.6, d: 0.9 }, h: 0.8, color: '#5b3e28', solid: true },
    { box: { x: 1.6, z: -2.25, w: 0.5, d: 0.35 }, h: 0.22, y: 0.8, color: '#30302e' },
    { box: { x: 2.25, z: -2.15, w: 0.5, d: 0.4 }, h: 0.04, y: 0.8, color: '#efe6cf' },
    { box: { x: 0.4, z: -2.9, w: 1.4, d: 0.1 }, h: 1.2, y: 1.0, color: '#ffc27a', glow: true },
  ],
  figures: [],
  spots: [{ id: 'desk', x: 1.9, z: -1.4, r: 1.2, prompt: 'Sit down with the survey notes' }],
}

export const CURLY_AT = vec(-6.4, 5.4)

export const camp: Space = {
  id: 'camp',
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

export const spaces: Readonly<Record<SpaceId, Space>> = { bar, room, camp, flood }

export const owenLook = owen

export const FIGURE_WIDTH = 0.5

export const figureBox = (f: Figure): Box => ({ x: f.at.x, z: f.at.z, w: FIGURE_WIDTH, d: FIGURE_WIDTH })

export const solids = (s: Space): readonly Box[] => [...s.props.filter((p) => p.solid).map((p) => p.box), ...s.figures.map(figureBox)]

export const occluders = (s: Space): readonly Box[] => s.props.filter((p) => p.occludes).map((p) => p.box)

const TURN = 0.9
const WORK = 4.6
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

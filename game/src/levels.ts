import type { Box, Interactable, Vec } from './world.ts'
import { vec } from './world.ts'

export type SpaceId = 'bar'

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
  wall(0, d / 2, w, 0.3, color, 1),
  wall(-w / 2, 0, 0.3, d, color),
  wall(w / 2, 0, 0.3, d, color),
]

const owen = { skin: '#d9a982', hair: '#6b4a2e' }

export const bar: Space = {
  id: 'bar',
  name: 'The Silver Pan',
  season: 'summer',
  size: { w: 12, d: 10 },
  ground: '#5a3d2b',
  spawn: vec(0, 3.9),
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
    { id: 'hank', x: -1.5, z: -2.6, r: 1.5, prompt: 'Buy the table a round' },
    { id: 'door', x: 0, z: 4.4, r: 1.0, prompt: 'Say goodnight and walk back to your room' },
  ],
}

export const spaces: Readonly<Record<SpaceId, Space>> = { bar }

export const owenLook = owen

export const solids = (s: Space): readonly Box[] => s.props.filter((p) => p.solid).map((p) => p.box)

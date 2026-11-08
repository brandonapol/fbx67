import type { Bus } from './mixer.ts'
import type { Ground } from './footsteps.ts'
import type { SpaceId } from './levels.ts'
import { CURLY_PERIOD, WORK } from './levels.ts'
import type { Game } from './prologue.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

export type Color = 'white' | 'pink' | 'brown'

export type Filter = 'lowpass' | 'highpass' | 'bandpass'

export type Wobble = Readonly<{ rate: number; depth: number; on: 'gain' | 'freq' }>

export type Noise = Readonly<{
  kind: 'noise'
  bus: Bus
  color: Color
  filter: Filter
  freq: number
  q?: number
  gain: number
  wobble?: Wobble
  at?: Vec
  alongX?: boolean
}>

export type Layer =
  | Noise
  | Readonly<{ kind: 'walla'; bus: Bus; gain: number; voices: number }>
  | Readonly<{ kind: 'jukebox'; bus: Bus; gain: number; at: Vec }>
  | Readonly<{ kind: 'reel'; bus: Bus; gain: number; at: Vec }>

export type Spot = 'clink' | 'crackle' | 'mosquito' | 'car' | 'typewriter' | 'glug' | 'door'

export type Condition = 'writing' | 'refueling'

export type Event = Readonly<{
  spot: Spot
  bus: Bus
  every: readonly [number, number]
  at?: Vec
  spread?: number
  when?: Condition
}>

export type Soundscape = Readonly<{
  ground: Ground
  layers: readonly Layer[]
  events: readonly Event[]
  arrival?: Spot
}>

export const JUKEBOX_AT = vec(-5.4, -1.6)
export const STOVE_AT = vec(5.1, -3.8)
export const REEL_AT = vec(1.6, -2.25)
export const DRUM_AT = vec(-6.8, 6.6)
export const CREEK_Z = 9.2

const bar: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    { kind: 'walla', bus: 'voice', gain: 1.6, voices: 7 },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 160, gain: 0.25 },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 90, gain: 0.2, at: STOVE_AT, wobble: { rate: 0.3, depth: 0.2, on: 'gain' } },
    { kind: 'jukebox', bus: 'music', gain: 1.2, at: JUKEBOX_AT },
  ],
  events: [
    { spot: 'clink', bus: 'ambience', every: [0.8, 3.5], at: vec(-1.5, -3.6), spread: 3 },
    { spot: 'crackle', bus: 'ambience', every: [0.05, 0.6], at: STOVE_AT, spread: 0.2 },
  ],
}

const room: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 130, gain: 0.35 },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 420, q: 0.6, gain: 0.05, at: vec(0.4, -3.2), wobble: { rate: 0.05, depth: 0.5, on: 'gain' } },
    { kind: 'reel', bus: 'sfx', gain: 0.18, at: REEL_AT },
  ],
  events: [
    { spot: 'car', bus: 'ambience', every: [8, 22], at: vec(0.4, -9), spread: 6 },
    { spot: 'typewriter', bus: 'sfx', every: [0.09, 0.4], at: REEL_AT, spread: 0.1, when: 'writing' },
  ],
  arrival: 'door',
}

const camp: Soundscape = {
  ground: {
    surface: 'gravel',
    regions: [{ box: { x: 0, z: 7.4, w: 28, d: 1.6 }, surface: 'mud' }],
  },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 1400, q: 0.9, gain: 0.5, at: vec(0, CREEK_Z), alongX: true, wobble: { rate: 0.7, depth: 0.35, on: 'freq' } },
    { kind: 'noise', bus: 'ambience', color: 'white', filter: 'bandpass', freq: 3200, q: 1.4, gain: 0.18, at: vec(0, CREEK_Z), alongX: true, wobble: { rate: 1.3, depth: 0.4, on: 'gain' } },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 320, gain: 0.18, wobble: { rate: 0.07, depth: 0.7, on: 'gain' } },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 900, q: 0.7, gain: 0.08, wobble: { rate: 0.11, depth: 0.8, on: 'gain' } },
  ],
  events: [
    { spot: 'mosquito', bus: 'ambience', every: [2.5, 7], spread: 2.5 },
    { spot: 'glug', bus: 'sfx', every: [0.35, 0.9], at: DRUM_AT, spread: 0.1, when: 'refueling' },
  ],
}

const flood: Soundscape = {
  ground: {
    surface: 'water',
    regions: [{ box: { x: 0, z: 7.0, w: 6, d: 0.8 }, surface: 'wood' }],
  },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'highpass', freq: 900, gain: 0.55, wobble: { rate: 0.09, depth: 0.6, on: 'gain' } },
    { kind: 'noise', bus: 'ambience', color: 'white', filter: 'bandpass', freq: 4200, q: 0.5, gain: 0.2, wobble: { rate: 0.23, depth: 0.6, on: 'gain' } },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 520, gain: 0.15, wobble: { rate: 0.21, depth: 0.4, on: 'freq' } },
  ],
  events: [],
}

export const soundscapes: Readonly<Record<SpaceId, Soundscape>> = { bar, room, camp, flood }

export const refueling = (t: number): boolean => ((t % CURLY_PERIOD) + CURLY_PERIOD) % CURLY_PERIOD < WORK

export const holds = (when: Condition | undefined, g: Game): boolean => {
  if (when === 'writing') return g.story.scene === 'p_letter' && g.panel?.kind === 'story'
  if (when === 'refueling') return g.space === 'camp' && !g.panel && refueling(g.t)
  return true
}

export const ducked = (g: Game): boolean => g.panel !== undefined

export const arrivals = (prev: Game | undefined, next: Game): readonly Spot[] => {
  const spot = soundscapes[next.space].arrival
  return prev && prev.space !== next.space && spot ? [spot] : []
}

export const walked = (prev: Game | undefined, next: Game): number =>
  prev && prev.space === next.space ? Math.hypot(next.pos.x - prev.pos.x, next.pos.z - prev.pos.z) : 0

export const sourceAt = (at: Vec, alongX: boolean | undefined, listener: Vec, halfWidth: number): Vec =>
  alongX ? vec(Math.max(-halfWidth, Math.min(halfWidth, listener.x)), at.z) : at

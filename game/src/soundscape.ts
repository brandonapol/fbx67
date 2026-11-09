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
  | Readonly<{ kind: 'idle'; bus: Bus; gain: number; at: Vec; rpm: number }>
  | Readonly<{ kind: 'hum'; bus: Bus; gain: number; at?: Vec; buzz: number }>
  | Readonly<{ kind: 'guitar'; bus: Bus; gain: number }>
  | Readonly<{ kind: 'outboard'; bus: Bus; gain: number; at: Vec; rpm: number }>

export type Spot = 'clink' | 'crackle' | 'mosquito' | 'car' | 'typewriter' | 'glug' | 'door' | 'raven' | 'perk'
  | 'sandbag'
  | 'shout'
  | 'drip'
  | 'shove'
  | 'stove'
  | 'bottle'
  | 'antlers'
  | 'roar'
  | 'knock'
  | 'keys'
  | 'boots'

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

const story: Soundscape = { ground: { surface: 'wood', regions: [] }, layers: [], events: [] }

export const soundscapes: Readonly<Record<SpaceId, Soundscape>> = { bar, room, camp, flood, story }

export type Act2Space = 'town' | 'base' | 'hotel' | 'hall'

export const FREEZEUP_F = 12

export const PLUGGED_AT: readonly Vec[] = [vec(-6, 3.5), vec(4.5, 4)]
export const URN_AT = vec(3.2, -2.6)

const town: Soundscape = {
  ground: { surface: 'snow', regions: [], tempF: FREEZEUP_F },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 260, gain: 0.3, wobble: { rate: 0.06, depth: 0.7, on: 'gain' } },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'highpass', freq: 2600, gain: 0.04, wobble: { rate: 0.13, depth: 0.8, on: 'gain' } },
    ...PLUGGED_AT.map((at, i): Layer => ({ kind: 'idle', bus: 'ambience', gain: 0.22, at, rpm: 720 + 90 * i })),
  ],
  events: [{ spot: 'raven', bus: 'ambience', every: [6, 18], at: vec(0, -9), spread: 9 }],
}

const base: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    { kind: 'hum', bus: 'ambience', gain: 0.12, buzz: 0.35 },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'lowpass', freq: 520, gain: 0.16 },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 110, gain: 0.3 },
  ],
  events: [{ spot: 'door', bus: 'ambience', every: [18, 45], at: vec(0, -10), spread: 6 }],
}

const hotel: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    { kind: 'walla', bus: 'voice', gain: 1.3, voices: 5 },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 150, gain: 0.25 },
    { kind: 'guitar', bus: 'music', gain: 0.9 },
  ],
  events: [{ spot: 'clink', bus: 'ambience', every: [1.2, 4.5], at: vec(-1.5, -3.6), spread: 3 }],
}

const hall: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 120, gain: 0.3 },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 2200, q: 1.2, gain: 0.03, at: URN_AT },
    { kind: 'hum', bus: 'ambience', gain: 0.03, at: URN_AT, buzz: 0 },
  ],
  events: [{ spot: 'perk', bus: 'ambience', every: [0.4, 2.8], at: URN_AT, spread: 0.05 }],
}

export const act2Soundscapes: Readonly<Record<Act2Space, Soundscape>> = { town, base, hotel, hall }

export type Act1Space = 'line' | 'hospital' | 'barfight' | 'cell'

export const RIVER_Z = -7
export const BOATS_AT: readonly Vec[] = [vec(-7, RIVER_Z - 2), vec(6, RIVER_Z - 4)]
export const LINE_AT = vec(0, -3)
export const DRIPS_AT: readonly Vec[] = [vec(-2.5, -4), vec(1.8, 2.5), vec(0.4, 7)]
export const RACK_AT = vec(-6.5, 2.4)
export const RADIATOR_AT = vec(-1.8, -1.6)
export const CORRIDOR_AT = vec(0, 4)

const rain = (gain: number): readonly Layer[] => [
  { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'highpass', freq: 900, gain, wobble: { rate: 0.09, depth: 0.6, on: 'gain' } },
  { kind: 'noise', bus: 'ambience', color: 'white', filter: 'bandpass', freq: 4200, q: 0.5, gain: gain * 0.35, wobble: { rate: 0.23, depth: 0.6, on: 'gain' } },
]

const line: Soundscape = {
  ground: {
    surface: 'mud',
    regions: [{ box: { x: 0, z: RIVER_Z, w: 40, d: 6 }, surface: 'water' }],
  },
  layers: [
    ...rain(0.5),
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 480, gain: 0.3, at: vec(0, RIVER_Z), alongX: true, wobble: { rate: 0.17, depth: 0.4, on: 'freq' } },
    ...BOATS_AT.map((at, i): Layer => ({ kind: 'outboard', bus: 'ambience', gain: 0.12, at, rpm: 4200 + 700 * i })),
  ],
  events: [
    { spot: 'sandbag', bus: 'sfx', every: [0.9, 3], at: LINE_AT, spread: 6 },
    { spot: 'shout', bus: 'voice', every: [3, 9], at: vec(0, RIVER_Z), spread: 9 },
  ],
}

const hospital: Soundscape = {
  ground: { surface: 'concrete', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 100, gain: 0.28 },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'highpass', freq: 1200, gain: 0.03, wobble: { rate: 0.08, depth: 0.7, on: 'gain' } },
    { kind: 'hum', bus: 'ambience', gain: 0.04, buzz: 0.2 },
  ],
  events: [
    ...DRIPS_AT.map((at): Event => ({ spot: 'drip', bus: 'ambience', every: [0.7, 2.6], at, spread: 0.05 })),
    { spot: 'door', bus: 'ambience', every: [25, 60], at: vec(0, -12), spread: 2 },
  ],
}

const barfight: Soundscape = {
  ground: { surface: 'mud', regions: [] },
  layers: [
    { kind: 'walla', bus: 'voice', gain: 1.8, voices: 6 },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 90, gain: 0.2, at: STOVE_AT, wobble: { rate: 0.3, depth: 0.2, on: 'gain' } },
  ],
  events: [
    { spot: 'roar', bus: 'voice', every: [5, 14], spread: 4 },
    { spot: 'shove', bus: 'sfx', every: [1.5, 5], spread: 2.5 },
    { spot: 'stove', bus: 'sfx', every: [9, 22], at: STOVE_AT, spread: 0.3 },
    { spot: 'bottle', bus: 'sfx', every: [4, 12], at: vec(-1.5, -3.6), spread: 3 },
    { spot: 'antlers', bus: 'sfx', every: [10, 26], at: RACK_AT, spread: 0.2 },
    { spot: 'crackle', bus: 'ambience', every: [0.05, 0.6], at: STOVE_AT, spread: 0.2 },
  ],
}

const cell: Soundscape = {
  ground: { surface: 'concrete', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 120, gain: 0.3 },
    { kind: 'noise', bus: 'ambience', color: 'white', filter: 'highpass', freq: 6000, gain: 0.015, at: RADIATOR_AT, wobble: { rate: 0.05, depth: 0.8, on: 'gain' } },
  ],
  events: [
    { spot: 'knock', bus: 'ambience', every: [4, 15], at: RADIATOR_AT, spread: 0.1 },
    { spot: 'keys', bus: 'sfx', every: [18, 45], at: CORRIDOR_AT, spread: 3 },
    { spot: 'boots', bus: 'sfx', every: [20, 50], at: CORRIDOR_AT, spread: 4 },
  ],
}

export const act1Soundscapes: Readonly<Record<Act1Space, Soundscape>> = { line, hospital, barfight, cell }

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

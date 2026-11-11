import type { Bus } from './mixer.ts'
import type { Ground } from './footsteps.ts'
import { SEASON_F } from './footsteps.ts'
import type { SpaceId } from './levels.ts'
import { REEL_AT, TYPEWRITER_AT } from './levels.ts'
import { beatOf, clockOf, cueBetween } from './curly.ts'
import { DRUM } from './camp.ts'
import { JUKEBOX } from './silverPan.ts'
import type { Game } from './prologue.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import { PORCH, WALKWAY } from './highwater.ts'
import { LINE_Z } from './searchEli.ts'
import type { Rect } from './downtown.ts'
import type { Bed } from './recordings.ts'
import { LAB } from './eielson.ts'

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
  | Recording

// A recorded bed (recordings.ts). Its procedural layers play until the file has loaded, then it crossfades in; they
// carry no position of their own, since the recording's panner places the whole bed.
export type Recording = Readonly<{
  kind: 'recording'
  bus: Bus
  clip: Bed
  gain: number
  at?: Vec
  alongX?: boolean
  fallback: readonly Layer[]
}>

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
  | 'cough'
  | 'impact'
  | 'snap'
  | 'calls'
  | 'fall'
  | 'screen'
  | 'sting'

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

// A recording's gain against its procedural fallback, per unit of the fallback's own gain. tools/audio.ts normalizes
// every bed to 0.1 RMS (BED_RMS there); each number here is the fallback's RMS at unit gain over that, measured
// offline on the same noise buffers and filters (docs/audio/sources.md, Levels). Swapping in a recording keeps the mix.
export const WALLA_GAIN = 0.18
export const CREEK_GAIN = 0.52
export const SPRUCE_GAIN = 0.38
export const RAIN_GAIN = 1.74
export const FLOOD_GAIN = 1.89

// The Silver Pan's sources sit on the props in silverPan.ts: the jukebox on the east wall, the oil stove in the
// southwest corner, the moose rack over the door.
export const JUKEBOX_AT = JUKEBOX
export const STOVE_AT = vec(-5.2, 4.1)
export { REEL_AT }
export const RADIO_AT = vec(-7.4, 3.4)
export const DRUM_AT = DRUM
export const CREEK_Z = 9.2

export const BAR_DOOR_AT = vec(0, 4.8)

const walla = (gain: number, voices: number): Layer => ({
  kind: 'recording',
  bus: 'voice',
  clip: 'walla',
  gain: gain * WALLA_GAIN,
  fallback: [{ kind: 'walla', bus: 'voice', gain, voices }],
})

const bar: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    walla(1.6, 7),
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 160, gain: 0.25 },
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 90, gain: 0.2, at: STOVE_AT, wobble: { rate: 0.3, depth: 0.2, on: 'gain' } },
    { kind: 'jukebox', bus: 'music', gain: 1.2, at: JUKEBOX_AT },
  ],
  events: [
    { spot: 'clink', bus: 'ambience', every: [0.8, 3.5], at: vec(-1.5, -3.6), spread: 3 },
    { spot: 'crackle', bus: 'ambience', every: [0.05, 0.6], at: STOVE_AT, spread: 0.2 },
    { spot: 'screen', bus: 'sfx', every: [30, 75], at: BAR_DOOR_AT, spread: 0.3 },
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
    { spot: 'typewriter', bus: 'sfx', every: [0.09, 0.4], at: TYPEWRITER_AT, spread: 0.1, when: 'writing' },
  ],
  arrival: 'door',
}

// The ground floor: the landlady's radio, an AM station low in the parlor, and the street through the front door.
const boarding: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 130, gain: 0.3 },
    { kind: 'noise', bus: 'music', color: 'pink', filter: 'bandpass', freq: 1100, q: 1.6, gain: 0.12, at: RADIO_AT, wobble: { rate: 0.4, depth: 0.5, on: 'gain' } },
  ],
  events: [{ spot: 'car', bus: 'ambience', every: [8, 22], at: vec(0, 9), spread: 6 }],
  arrival: 'door',
}

const camp: Soundscape = {
  ground: {
    surface: 'gravel',
    regions: [{ box: { x: 0, z: 7.4, w: 28, d: 1.6 }, surface: 'mud' }],
  },
  layers: [
    {
      kind: 'recording',
      bus: 'ambience',
      clip: 'creek',
      gain: CREEK_GAIN,
      at: vec(0, CREEK_Z),
      alongX: true,
      fallback: [
        { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 1400, q: 0.9, gain: 0.5, wobble: { rate: 0.7, depth: 0.35, on: 'freq' } },
        { kind: 'noise', bus: 'ambience', color: 'white', filter: 'bandpass', freq: 3200, q: 1.4, gain: 0.18, wobble: { rate: 1.3, depth: 0.4, on: 'gain' } },
      ],
    },
    {
      kind: 'recording',
      bus: 'ambience',
      clip: 'spruce',
      gain: SPRUCE_GAIN,
      fallback: [
        { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 320, gain: 0.18, wobble: { rate: 0.07, depth: 0.7, on: 'gain' } },
        { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 900, q: 0.7, gain: 0.08, wobble: { rate: 0.11, depth: 0.8, on: 'gain' } },
      ],
    },
  ],
  events: [
    { spot: 'mosquito', bus: 'ambience', every: [2.5, 7], spread: 2.5 },
    { spot: 'glug', bus: 'sfx', every: [0.35, 0.9], at: DRUM_AT, spread: 0.1, when: 'refueling' },
  ],
}

// Rain and moving water are recorded; each keeps the procedural version underneath as its fallback, scaled with it.
const rain = (gain: number): readonly Layer[] => [
  {
    kind: 'recording',
    bus: 'ambience',
    clip: 'rain',
    gain: gain * RAIN_GAIN,
    fallback: [
      { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'highpass', freq: 900, gain, wobble: { rate: 0.09, depth: 0.6, on: 'gain' } },
      { kind: 'noise', bus: 'ambience', color: 'white', filter: 'bandpass', freq: 4200, q: 0.5, gain: gain * 0.35, wobble: { rate: 0.23, depth: 0.6, on: 'gain' } },
    ],
  },
]

const rushing = (gain: number, freq: number, rate: number, at?: Vec): Layer => ({
  kind: 'recording',
  bus: 'ambience',
  clip: 'flood',
  gain: gain * FLOOD_GAIN,
  ...(at ? { at, alongX: true } : {}),
  fallback: [{ kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq, gain, wobble: { rate, depth: 0.4, on: 'freq' } }],
})

const boxOf = (r: Rect) => ({ x: (r[0] + r[1]) / 2, z: (r[2] + r[3]) / 2, w: r[1] - r[0], d: r[3] - r[2] })

// The flooded street: water everywhere but the porch and the plank walkway along the block (highwater.ts).
const flood: Soundscape = {
  ground: {
    surface: 'water',
    regions: [PORCH, WALKWAY].map((r) => ({ box: boxOf(r), surface: 'wood' as const })),
  },
  layers: [...rain(0.55), rushing(0.15, 520, 0.21)],
  events: [],
}

const downtown: Soundscape = {
  ground: { surface: 'gravel', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 320, gain: 0.18, wobble: { rate: 0.07, depth: 0.7, on: 'gain' } },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 900, q: 0.7, gain: 0.08, wobble: { rate: 0.11, depth: 0.8, on: 'gain' } },
  ],
  events: [{ spot: 'car', bus: 'ambience', every: [6, 18], spread: 8 }],
}

// Lucy's kitchen in the fall: the stove ticking over, the wind at the window.
const kitchen: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [{ kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 220, gain: 0.08, at: vec(-2.5, 2) }],
  events: [],
}

const story: Soundscape = { ground: { surface: 'wood', regions: [] }, layers: [], events: [] }


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
    walla(1.3, 5),
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

// The line in the flooded town (searchEli.ts), and the deep water north of it on Second where the boats run.
export const LINE_AT = vec(-1, LINE_Z)
export const RIVER_Z = LINE_Z - 8
export const BOATS_AT: readonly Vec[] = [vec(-7, RIVER_Z - 2), vec(6, RIVER_Z - 4)]
export const DRIPS_AT: readonly Vec[] = [vec(-2.5, -4), vec(1.8, 2.5), vec(0.4, 7)]
export const RACK_AT = vec(0, 4.78)
export const RADIATOR_AT = vec(-1.8, -1.6)
export const CORRIDOR_AT = vec(0, 4)

const line: Soundscape = {
  ground: {
    surface: 'mud',
    regions: [{ box: { x: 0, z: RIVER_Z, w: 40, d: 6 }, surface: 'water' }],
  },
  layers: [
    ...rain(0.5),
    rushing(0.3, 480, 0.17, vec(0, RIVER_Z)),
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

// The land office: the river standing in the ground floor, the drip off the ceiling, the street through the open door.
const office: Soundscape = {
  ground: { surface: 'water', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 140, gain: 0.26 },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 700, q: 0.8, gain: 0.04, at: vec(0, -5), wobble: { rate: 0.11, depth: 0.5, on: 'gain' } },
  ],
  events: [
    ...[vec(-2.5, -1), vec(1.5, 2), vec(3.8, -3)].map((at): Event => ({ spot: 'drip', bus: 'ambience', every: [0.8, 3], at, spread: 0.05 })),
    { spot: 'door', bus: 'ambience', every: [30, 70], at: vec(0, -6), spread: 2 },
  ],
}

export const act1Soundscapes: Readonly<Record<Act1Space, Soundscape>> = { line, hospital, barfight, cell }

// Act 3, deep winter: the town at forty below, the flight home, Lucy's night at the wreck, and Wade's search on skis.
export type Act3Space = 'icefog' | 'cockpit' | 'crash' | 'slope'

export const FIRE_AT = vec(1.5, 2)
export const SPRUCE_AT = vec(-6, -8)
export const SEARCHERS_AT = vec(0, -30)

const deepWinter = SEASON_F.winter

const wind = (gain: number): readonly Layer[] => [
  { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 300, gain, wobble: { rate: 0.05, depth: 0.8, on: 'gain' } },
  { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'bandpass', freq: 800, q: 0.6, gain: gain * 0.4, wobble: { rate: 0.09, depth: 0.8, on: 'freq' } },
]

// Ice fog swallows the town: no wind, a low hush, one plugged-in car somewhere down the block.
const icefog: Soundscape = {
  ground: { surface: 'snow', regions: [], tempF: deepWinter },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 180, gain: 0.18 },
    { kind: 'idle', bus: 'ambience', gain: 0.08, at: vec(5, 6), rpm: 680 },
  ],
  events: [
    { spot: 'raven', bus: 'ambience', every: [15, 40], at: vec(0, -12), spread: 10 },
    { spot: 'snap', bus: 'ambience', every: [12, 35], spread: 14 },
  ],
}

// The flight home: the engine's drone and the slipstream; it coughs on the water in the fuel.
const cockpit: Soundscape = {
  ground: { surface: 'wood', regions: [] },
  layers: [
    { kind: 'idle', bus: 'ambience', gain: 0.35, at: vec(0, -1.5), rpm: 2300 },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'highpass', freq: 1500, gain: 0.12, wobble: { rate: 0.2, depth: 0.3, on: 'gain' } },
  ],
  events: [{ spot: 'cough', bus: 'sfx', every: [8, 20], at: vec(0, -1.5), spread: 0.2 }],
}

// Lucy's night: the fire she keeps going, the wind down the slope, spruce cracking in the cold.
const crash: Soundscape = {
  ground: { surface: 'snow', regions: [], tempF: deepWinter },
  layers: [
    ...wind(0.22),
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 120, gain: 0.2, at: FIRE_AT, wobble: { rate: 0.4, depth: 0.3, on: 'gain' } },
  ],
  events: [
    { spot: 'crackle', bus: 'ambience', every: [0.05, 0.5], at: FIRE_AT, spread: 0.2 },
    { spot: 'snap', bus: 'ambience', every: [10, 30], at: SPRUCE_AT, spread: 8 },
  ],
}

// Wade's search: the wind on the slope, his own ski track underfoot, the search team calling and dropping away.
const slope: Soundscape = {
  ground: { surface: 'ski', regions: [], tempF: deepWinter },
  layers: wind(0.28),
  events: [
    { spot: 'calls', bus: 'voice', every: [25, 60], at: SEARCHERS_AT, spread: 12 },
    { spot: 'snap', bus: 'ambience', every: [12, 35], at: SPRUCE_AT, spread: 10 },
  ],
}

// The crash itself ('impact') and Wade's falls ('fall') are beats, not weather: the missions fire them.
export const act3Soundscapes: Readonly<Record<Act3Space, Soundscape>> = { icefog, cockpit, crash, slope }

// The base in freeze-up: wind over the flat, the central steam plant's hum, a truck idling somewhere on the line. The
// photo lab's floor is concrete, so Wade hears its people's steps come down the hall.
const airbase: Soundscape = {
  ground: { surface: 'gravel', regions: [{ box: boxOf(LAB), surface: 'concrete' }], tempF: SEASON_F.freezeup },
  layers: [
    ...wind(0.18),
    { kind: 'hum', bus: 'ambience', gain: 0.05, buzz: 0.2 },
    { kind: 'idle', bus: 'ambience', gain: 0.06, at: vec(245, 0), rpm: 700 },
  ],
  events: [{ spot: 'door', bus: 'ambience', every: [20, 50], spread: 60 }],
}

// The slough out to the cabin in the evening: still water against the hull, the river moving somewhere off past the
// spruce, a raven now and then.
const cabin: Soundscape = {
  ground: { surface: 'water', regions: [] },
  layers: [
    { kind: 'noise', bus: 'ambience', color: 'brown', filter: 'lowpass', freq: 380, gain: 0.22, wobble: { rate: 0.12, depth: 0.4, on: 'freq' } },
    { kind: 'noise', bus: 'ambience', color: 'pink', filter: 'highpass', freq: 1200, gain: 0.12, wobble: { rate: 0.3, depth: 0.6, on: 'gain' } },
  ],
  events: [{ spot: 'raven', bus: 'ambience', every: [20, 50], spread: 20 }],
}

// The bush strip and the base hangar's door in November: packed snow underfoot and the wind (bushStrip.ts).
const strip: Soundscape = { ground: { surface: 'snow', regions: [], tempF: SEASON_F.freezeup }, layers: [...wind(0.2)], events: [] }

// The hotel bar downtown has the bar room's bed: talk, glasses, a stove, the jukebox under the guitar.
// The spaces built so far. An Act 1, 2 or 3 bed joins here when its space is added to levels.ts.
export const soundscapes: Readonly<Record<SpaceId, Soundscape>> = { bar, pan: barfight, boarding, room, camp, flood, line, downtown, jail: cell, helpTent: hospital, office, eielson: airbase, cabin, kitchen, hotelBar: bar, strip, steak: bar, hangar: strip, story }

// Curly's routine clock at the camp (curly.ts): refueling is its first beat.
export const refueling = (t: number): boolean => beatOf(t) === 'refuel'

const curlyClock = (g: Game): number => clockOf(g.watch ?? { lost: 0, aware: 0 }, g.t)

export const holds = (when: Condition | undefined, g: Game): boolean => {
  if (when === 'writing') return g.panel?.kind === 'letter' && (g.typed ?? 0) < g.panel.text.length
  if (when === 'refueling') return g.space === 'camp' && !g.panel && refueling(curlyClock(g))
  return true
}

// Curly's lighter as he finishes a task, just before he looks over the camp: the stealth cue (curly.ts).
export const cues = (prev: Game | undefined, next: Game): readonly Spot[] =>
  prev && prev.space === 'camp' && next.space === 'camp' && !next.panel && cueBetween(curlyClock(prev), curlyClock(next)) ? ['snap'] : []

export const ducked = (g: Game): boolean => g.panel !== undefined

export const arrivals = (prev: Game | undefined, next: Game): readonly Spot[] => {
  const spot = soundscapes[next.space].arrival
  return prev && prev.space !== next.space && spot ? [spot] : []
}

export const walked = (prev: Game | undefined, next: Game): number =>
  prev && prev.space === next.space ? Math.hypot(next.pos.x - prev.pos.x, next.pos.z - prev.pos.z) : 0

export const sourceAt = (at: Vec, alongX: boolean | undefined, listener: Vec, halfWidth: number): Vec =>
  alongX ? vec(Math.max(-halfWidth, Math.min(halfWidth, listener.x)), at.z) : at

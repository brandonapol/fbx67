import type { Clock, State } from '../../text-game/src/types.ts'
import type { Season as StorySeason, Weather } from '../../text-game/src/story.ts'
import { clock, season, weather } from '../../text-game/src/story.ts'
import type { Season, Space, SpaceId } from './levels.ts'
import { sunAt } from './sun.ts'

// Light, sky, fog and grade per space, season and moral weather, from docs/art/README.md ("Light", "Summer, the
// Prologue" and "Moral weather"). Pure data: render.ts applies it, and lighting.test.ts holds it to the art rules.

// The three moral-weather bands of design.md, keyed by the story's weather. The Prologue (summer) is not banded.
export type Band = 'alpenglow' | 'blueHour' | 'sodium'

export const bandOf: Readonly<Record<Weather, Band>> = { clear: 'alpenglow', dusk: 'blueHour', night: 'sodium' }

// The grade: PlayCanvas CameraFrame's grading, applied in HDR before tonemapping (brightness is an exposure multiplier,
// 1 leaves the frame alone; tint multiplies), and the vignette's strength.
export type Grade = Readonly<{ brightness: number; contrast: number; saturation: number; tint: string; vignette: number }>

export type Sky = Readonly<{ zenith: string; horizon: string; sunward: string }>

export type Lamp = Readonly<{ color: string; intensity: number; range: number; at: readonly [number, number, number] }>

export type Lighting = Readonly<{
  grade: Band | 'summer'
  sky: Sky
  ambient: string
  sun: string
  sunIntensity: number
  // Compass degrees: azimuth clockwise from north (world -z; x is east), elevation above the horizon.
  sunAzimuth: number
  sunElevation: number
  // False when the band's key is not the sun ("sun none" in the band table): the directional light is then a soft
  // sky fill with no shadows, and the sky has no glow toward it.
  sunUp: boolean
  fog: string
  fogStart: number
  fogEnd: number
  lamp?: Lamp
  rain: boolean
}>

export const grades: Readonly<Record<Lighting['grade'], Grade>> = {
  // Muted and grounded: warmth comes from the light, so the grade only pulls saturation down a touch.
  summer: { brightness: 1.3, contrast: 1.06, saturation: 0.78, tint: '#fff8f0', vignette: 0.25 },
  // Clean: rose-gold, lifted and soft.
  alpenglow: { brightness: 1.05, contrast: 0.98, saturation: 0.95, tint: '#fff0ea', vignette: 0.2 },
  // Strained: cold and flattened.
  blueHour: { brightness: 1, contrast: 1, saturation: 0.72, tint: '#dde6ff', vignette: 0.35 },
  // Danger: sodium amber, crushed and close.
  sodium: { brightness: 0.7, contrast: 1, saturation: 0.55, tint: '#ffe8cc', vignette: 0.4 },
}

// The Prologue, July at 11 pm: the sun north-northwest, its disc just up (the stated cheat in docs/art/README.md).
// With a story clock the sun is the real one (sun.ts); these are the sun's place when a scene has no clock.
const summer: Lighting = {
  grade: 'summer',
  sky: { zenith: '#8592b4', horizon: '#7d8fb8', sunward: '#f3b98a' },
  ambient: '#a09cae',
  sun: '#ffc48a',
  sunIntensity: 2.4,
  sunAzimuth: 340,
  sunElevation: 3,
  sunUp: true,
  fog: '#c4aa9a',
  fogStart: 30,
  fogEnd: 220,
  rain: false,
}

// Act 1, the flood (August 1967, overcast): each band's key and palette from the band table, sun none.
const flood: Readonly<Record<Band, Lighting>> = {
  alpenglow: {
    grade: 'alpenglow',
    sky: { zenith: '#7f8fb5', horizon: '#f2b8a8', sunward: '#f2b8a8' },
    ambient: '#9aa5c4',
    sun: '#ffc7a6',
    sunIntensity: 0.7,
    sunAzimuth: 200,
    sunElevation: 55,
    sunUp: false,
    fog: '#e7c4c0',
    fogStart: 10,
    fogEnd: 120,
    rain: true,
  },
  blueHour: {
    grade: 'blueHour',
    sky: { zenith: '#2f3d6b', horizon: '#6d7fae', sunward: '#6d7fae' },
    ambient: '#9aa6d0',
    sun: '#8b9ac4',
    sunIntensity: 0.35,
    sunAzimuth: 200,
    sunElevation: 55,
    sunUp: false,
    fog: '#4f5f8a',
    fogStart: 8,
    fogEnd: 80,
    rain: true,
  },
  sodium: {
    grade: 'sodium',
    sky: { zenith: '#1a1a20', horizon: '#3a3026', sunward: '#3a3026' },
    ambient: '#a8947a',
    sun: '#8a6f50',
    sunIntensity: 0.15,
    sunAzimuth: 200,
    sunElevation: 55,
    sunUp: false,
    fog: '#6b5a44',
    fogStart: 4,
    fogEnd: 40,
    rain: true,
  },
}

// The band's key where it is not the sun: streetlights at blue hour, sodium lamps at danger.
const streetKey: Readonly<Record<Band, string | undefined>> = { alpenglow: undefined, blueHour: '#ffd9a0', sodium: '#ff9a3c' }

// The one streetlight each outdoor space has today, at its lamp head.
const streetlight: Readonly<Partial<Record<SpaceId, Lamp['at']>>> = { flood: [6.5, 3.85, -4.5] }

// Interiors are lit by their practicals: bulbs at about 2700 K (#ffb877) and the window, with warm bounce in the shade.
const indoorLamp: Readonly<Partial<Record<SpaceId, Lamp>>> = {
  bar: { color: '#ffb877', intensity: 2.2, range: 14, at: [0, 2.6, 0] },
  room: { color: '#ffd29a', intensity: 1.8, range: 8, at: [1.2, 2.2, -1.2] },
  story: { color: '#8a93a6', intensity: 0.6, range: 10, at: [0, 3, 0] },
}

// Indoor fog is smoke in lamplight: warm and dark, never the sky's haze.
// Indoors fog veils the far wall of a 12 m room 10-20% (docs/art/README.md, Summer: start 2 m, end 60 m).
// No rain falls indoors, whatever the season outside.
const INDOOR = {
  fogStart: 2,
  fogEnd: 60,
  fog: '#4a3a2e',
  ambient: '#a49482',
  sunIntensity: summer.sunIntensity * 0.5,
  rain: false,
} as const

// The midnight-sun cheat (docs/art/README.md, Light): the Prologue text keeps the sun up at eleven, so while the real
// sun is below this elevation the disc is held here, in the north-northwest arc the rule gives for 11 pm.
export const MIDNIGHT_SUN = { elevation: 3, azimuth: [330, 350] } as const

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

// The summer sun at a clock: the real sun when it is above the cheat's disc, else the cheat. Azimuths are compared
// as signed degrees around north, so 8 degrees past north clamps to 350, not 330.
export const summerSun = (at: Clock): Pick<Lighting, 'sunAzimuth' | 'sunElevation'> => {
  const real = sunAt(at)
  if (real.elevation >= MIDNIGHT_SUN.elevation) return { sunAzimuth: real.azimuth, sunElevation: real.elevation }
  const signed = real.azimuth > 180 ? real.azimuth - 360 : real.azimuth
  const [lo, hi] = MIDNIGHT_SUN.azimuth
  return { sunAzimuth: clamp(signed, lo - 360, hi - 360) + 360, sunElevation: MIDNIGHT_SUN.elevation }
}

const outdoors = (space: SpaceId, season: Season, weather: Weather, when?: Clock): Lighting => {
  if (season === 'summer') return when === undefined ? summer : { ...summer, ...summerSun(when) }
  const band = bandOf[weather]
  const base = flood[band]
  const key = streetKey[band]
  const at = streetlight[space]
  return key && at ? { ...base, lamp: { color: key, intensity: band === 'sodium' ? 2.6 : 1.8, range: 16, at } } : base
}

// The story backdrop belongs to no place: a slate floor fading into slate, lit only enough to read as a room.
const STORY = { fog: '#3a3f4c', fogStart: 0, fogEnd: 12, ambient: '#8a93a6' } as const

export const lighting = (space: SpaceId, season: Season, weather: Weather, when?: Clock): Lighting => {
  const base = outdoors(space, season, weather, when)
  const lamp = indoorLamp[space]
  if (!lamp) return base
  return { ...base, ...INDOOR, ...(space === 'story' ? STORY : {}), lamp }
}

const isLit = (x: StorySeason | undefined): x is Season => x === 'summer' || x === 'flood'

// When a space is lit: the story's clock, and the season from it (docs/story-api.md, "Where, when and what next").
// A scene with no clock, or a season the engine has no light for yet (freeze-up, winter, breakup), keeps the space's
// own. The story backdrop belongs to no place and no hour, so it keeps its own too.
export const timeOf = (space: Space, s: State): Readonly<{ season: Season; clock?: Clock }> => {
  if (space.id === 'story') return { season: space.season }
  const story = season(s)
  return { season: isLit(story) ? story : space.season, clock: clock(s) }
}

export const lightingFor = (space: Space, s: State): Lighting => {
  const t = timeOf(space, s)
  return lighting(space.id, t.season, weather(s), t.clock)
}

// The unit vector toward the sun in world space (x east, y up, z south).
export const sunDirection = (l: Pick<Lighting, 'sunAzimuth' | 'sunElevation'>): readonly [number, number, number] => {
  const a = (l.sunAzimuth * Math.PI) / 180
  const e = (l.sunElevation * Math.PI) / 180
  return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]
}

const rgb = (hex: string): readonly [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const mix = (a: readonly number[], b: readonly number[], t: number): readonly [number, number, number] => [
  a[0]! + (b[0]! - a[0]!) * t,
  a[1]! + (b[1]! - a[1]!) * t,
  a[2]! + (b[2]! - a[2]!) * t,
]

// The analytic sky in sRGB for a unit view direction: horizon to zenith by height, warming toward the sun near the
// horizon, and the sun's disc and halo when it is up. Below the horizon it is the fog color, so the ground's far edge
// meets it without a seam; the first few degrees above blend fog into sky.
const HAZE_BAND = 0.08

export const skyColor = (l: Lighting, dir: readonly [number, number, number]): readonly [number, number, number] => {
  if (dir[1] <= 0) return rgb(l.fog)
  const up = dir[1]
  const sky = mix(rgb(l.sky.horizon), rgb(l.sky.zenith), Math.pow(up, 0.5))
  const away = mix(rgb(l.fog), sky, Math.min(1, up / HAZE_BAND))
  if (!l.sunUp) return away
  const s = sunDirection(l)
  const cos = dir[0] * s[0] + dir[1] * s[1] + dir[2] * s[2]
  const toward = Math.pow(Math.max(0, (cos + 1) / 2), 3) * (1 - Math.pow(up, 0.6))
  const glow = mix(away, rgb(l.sky.sunward), toward)
  const disc = cos > 0.9995 ? 1 : Math.pow(Math.max(0, cos), 600) * 0.6
  return mix(glow, rgb(l.sun), disc)
}

import type { Clock, State } from '../../text-game/src/types.ts'
import type { Season as StorySeason, Weather } from '../../text-game/src/story.ts'
import { clock, place, season, weather } from '../../text-game/src/story.ts'
import { replay } from '../../text-game/src/engine.ts'
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

// halo: the diameter in meters of the glow a lamp throws into haze, when the air holds enough to show one.
export type Lamp = Readonly<{
  color: string
  intensity: number
  range: number
  at: readonly [number, number, number]
  halo?: number
}>

// The seasons the engine has light for: the spaces' own (levels.ts) and deep winter, which only the story's clock
// reaches (Act 3, December to February).
export type LitSeason = Season | 'winter'

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
  // Deep winter outdoors: breath shows as fog at every exhale, and snow lies on roofs and spruce boughs.
  breath: boolean
  snowLoad: boolean
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
  breath: false,
  snowLoad: false,
}

// docs/art/README.md, "Band by season": each cell's sun (absent where the cell says "sun none") and fog range in
// meters. This is the table's one copy in code; lighting.test.ts reads the README and holds these rows to it. The
// Act 2 fall and Act 4 breakup rows come with their season layers.
export type Arc = Readonly<{ elevation: readonly [number, number]; azimuth: readonly [number, number] }>
export type Cell = Readonly<{ sun?: Arc; fog: readonly [number, number] }>
export type BandedSeason = Exclude<LitSeason, 'summer'>

export const bandBySeason: Readonly<Record<BandedSeason, Readonly<Record<Band, Cell>>>> = {
  // Act 1, flood (Aug 1967, overcast): overcast daylight, overcast dusk with streetlights, night in rain.
  flood: { alpenglow: { fog: [10, 120] }, blueHour: { fog: [8, 80] }, sodium: { fog: [4, 40] } },
  // Act 3, winter (Dec-Feb): alpenglow under a sun that barely clears the hills, blue hour, sodium in ice fog.
  winter: {
    alpenglow: { sun: { elevation: [0, 12], azimuth: [160, 220] }, fog: [60, 240] },
    blueHour: { fog: [30, 160] },
    sodium: { fog: [6, 70] },
  },
}

// Each band's palette, the same in every banded season: sky, ambient, the key's color and strength, and the haze.
// Where the cell has no sun the directional light is a soft overhead sky fill, so its place is fixed.
type Palette = Omit<Lighting, 'grade' | 'sunUp' | 'fogStart' | 'fogEnd' | 'lamp' | 'rain' | 'breath' | 'snowLoad'>
const SKY_FILL = { sunAzimuth: 200, sunElevation: 55 } as const

const palette: Readonly<Record<Band, Palette>> = {
  alpenglow: {
    sky: { zenith: '#7f8fb5', horizon: '#f2b8a8', sunward: '#f2b8a8' },
    ambient: '#9aa5c4',
    sun: '#ffc7a6',
    sunIntensity: 0.7,
    ...SKY_FILL,
    fog: '#e7c4c0',
  },
  blueHour: {
    sky: { zenith: '#2f3d6b', horizon: '#6d7fae', sunward: '#6d7fae' },
    ambient: '#9aa6d0',
    sun: '#8b9ac4',
    sunIntensity: 0.35,
    ...SKY_FILL,
    fog: '#4f5f8a',
  },
  sodium: {
    sky: { zenith: '#1a1a20', horizon: '#3a3026', sunward: '#3a3026' },
    ambient: '#a8947a',
    sun: '#8a6f50',
    sunIntensity: 0.15,
    ...SKY_FILL,
    fog: '#6b5a44',
  },
}

// What the air does in each banded season: rain in the flood; breath and snow load in deep winter.
const AIR: Readonly<Record<BandedSeason, Pick<Lighting, 'rain' | 'breath' | 'snowLoad'>>> = {
  flood: { rain: true, breath: false, snowLoad: false },
  winter: { rain: false, breath: true, snowLoad: true },
}

// The band's key where it is not the sun: streetlights at blue hour, sodium lamps at danger.
const streetKey: Readonly<Record<Band, Pick<Lamp, 'color' | 'intensity'> | undefined>> = {
  alpenglow: undefined,
  blueHour: { color: '#ffd9a0', intensity: 1.8 },
  sodium: { color: '#ff9a3c', intensity: 2.6 },
}
const STREETLIGHT_RANGE = 16

// The one streetlight each flooded space has today, at its lamp head.
const streetlight: Readonly<Partial<Record<SpaceId, Lamp['at']>>> = { flood: [6.5, 3.85, -4.5], line: [-6.6, 3.85, 2.5] }

// Interiors are lit by their practicals: bulbs at about 2700 K (#ffb877) and the window, with warm bounce in the shade.
const indoorLamp: Readonly<Partial<Record<SpaceId, Lamp>>> = {
  bar: { color: '#ffb877', intensity: 2.2, range: 14, at: [0, 2.6, 0] },
  boarding: { color: '#ffb877', intensity: 2.0, range: 12, at: [-2.5, 2.6, 2.5] },
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
  breath: false,
  snowLoad: false,
} as const

// The midnight-sun cheat (docs/art/README.md, Light): the Prologue text keeps the sun up at eleven, so while the real
// sun is below this elevation the disc is held here, in the north-northwest arc the rule gives for 11 pm.
export const MIDNIGHT_SUN = { elevation: 3, azimuth: [330, 350] } as const

// The winter clean band's sun (the Act 3 row). Without a clock it sits a little east of south, a few degrees up, as
// it does near noon in late December.
export const WINTER_SUN: Arc = bandBySeason.winter.alpenglow.sun!
const WINTER_NOON = { sunAzimuth: 185, sunElevation: 2 } as const
const WINTER_SUN_INTENSITY = 1.4

// In ice fog each sodium lamp reads as a halo about 4 m across.
export const ICE_FOG_HALO = 4

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

// The sun at a clock held inside a cell's arc.
const heldSun = (arc: Arc, at: Clock): Pick<Lighting, 'sunAzimuth' | 'sunElevation'> => {
  const real = sunAt(at)
  return { sunAzimuth: clamp(real.azimuth, ...arc.azimuth), sunElevation: clamp(real.elevation, ...arc.elevation) }
}

export const winterSun = (at: Clock): Pick<Lighting, 'sunAzimuth' | 'sunElevation'> => heldSun(WINTER_SUN, at)

// A banded season's light: the band's palette, the table's cell, and the season's air. A cell with a sun holds the
// real one inside its arc (the clean band always has its low disc); without a clock the disc sits at winter noon.
const banded = (season: BandedSeason, band: Band, when?: Clock): Lighting => {
  const cell = bandBySeason[season][band]
  const [fogStart, fogEnd] = cell.fog
  const base: Lighting = { ...palette[band], grade: band, sunUp: false, fogStart, fogEnd, ...AIR[season] }
  if (!cell.sun) return base
  const at = when === undefined ? WINTER_NOON : heldSun(cell.sun, when)
  return { ...base, sunUp: true, sunIntensity: WINTER_SUN_INTENSITY, ...at }
}

const outdoors = (space: SpaceId, season: LitSeason, weather: Weather, when?: Clock): Lighting => {
  if (season === 'summer') return when === undefined ? summer : { ...summer, ...summerSun(when) }
  const band = bandOf[weather]
  const base = banded(season, band, when)
  const key = streetKey[band]
  const at = streetlight[space]
  if (!key || !at) return base
  const halo = season === 'winter' && band === 'sodium' ? { halo: ICE_FOG_HALO } : {}
  return { ...base, lamp: { ...key, range: STREETLIGHT_RANGE, at, ...halo } }
}

// The story backdrop belongs to no place: a slate floor fading into slate, lit only enough to read as a room.
const STORY = { fog: '#3a3f4c', fogStart: 0, fogEnd: 12, ambient: '#8a93a6' } as const

export const lighting = (space: SpaceId, season: LitSeason, weather: Weather, when?: Clock): Lighting => {
  const base = outdoors(space, season, weather, when)
  const lamp = indoorLamp[space]
  if (!lamp) return base
  return { ...base, ...INDOOR, ...(space === 'story' ? STORY : {}), lamp }
}

const isLit = (x: StorySeason | undefined): x is LitSeason => x === 'summer' || x === 'flood' || x === 'winter'

export type Time = Readonly<{ season: LitSeason; clock?: Clock }>

// The scene whose hour a space shows: the current one when it is set here (or the space spans places, as downtown
// does); once the story has moved on to another place, the last scene on the path that was set here. Hiding at the
// camp sends the story to 14 August while Owen is still on the gravel bar in July.
const sceneHere = (space: Space, s: State, path: readonly number[]): State | undefined =>
  space.place === undefined || place(s) === space.place
    ? s
    : replay(path).findLast((x) => place(x) === space.place)

// When a space is lit: the story's clock, and the season from it (docs/story-api.md, "Where, when and what next").
// A scene with no clock, or a season the engine has no light for yet (freeze-up, breakup), keeps the space's
// own. The story backdrop belongs to no place and no hour, so it keeps its own too.
export const timeOf = (space: Space, s: State, path: readonly number[] = []): Time => {
  const here = space.id === 'story' ? undefined : sceneHere(space, s, path)
  if (!here) return { season: space.season }
  const story = season(here)
  return { season: isLit(story) ? story : space.season, clock: clock(here) }
}

export const lightingFor = (space: Space, s: State, path: readonly number[] = []): Lighting => {
  const t = timeOf(space, s, path)
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

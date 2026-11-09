import type { Weather } from '../../text-game/src/story.ts'
import type { Season, SpaceId } from './levels.ts'

export type Lighting = Readonly<{
  sky: string
  ambient: string
  sun: string
  sunIntensity: number
  sunPitch: number
  sunYaw: number
  fog: string
  fogStart: number
  fogEnd: number
  lamp?: Readonly<{ color: string; intensity: number; range: number; at: readonly [number, number, number] }>
  rain: boolean
}>

type Key = `${Season}:${Weather}`

const outdoor: Readonly<Record<Key, Lighting>> = {
  'summer:clear': {
    sky: '#f3b98a',
    ambient: '#6f6a7f',
    sun: '#ffc98a',
    sunIntensity: 1.6,
    sunPitch: -14,
    sunYaw: 200,
    fog: '#e9b693',
    fogStart: 30,
    fogEnd: 75,
    rain: false,
  },
  'summer:dusk': {
    sky: '#7d8fb8',
    ambient: '#4f5a7a',
    sun: '#c9b6e0',
    sunIntensity: 0.8,
    sunPitch: -8,
    sunYaw: 200,
    fog: '#6f7ea6',
    fogStart: 18,
    fogEnd: 50,
    rain: false,
  },
  'summer:night': {
    sky: '#1d2233',
    ambient: '#2a2f45',
    sun: '#ffb35c',
    sunIntensity: 0.35,
    sunPitch: -30,
    sunYaw: 120,
    fog: '#3a3326',
    fogStart: 6,
    fogEnd: 22,
    rain: false,
  },
  'flood:clear': {
    sky: '#8d939a',
    ambient: '#6a6f78',
    sun: '#c9cdd2',
    sunIntensity: 0.7,
    sunPitch: -55,
    sunYaw: 160,
    fog: '#8a8f96',
    fogStart: 8,
    fogEnd: 34,
    rain: true,
  },
  'flood:dusk': {
    sky: '#5f6878',
    ambient: '#4a5263',
    sun: '#a9b4c8',
    sunIntensity: 0.5,
    sunPitch: -40,
    sunYaw: 160,
    fog: '#5f6878',
    fogStart: 6,
    fogEnd: 26,
    rain: true,
  },
  'flood:night': {
    sky: '#1b1f27',
    ambient: '#262b36',
    sun: '#ffb35c',
    sunIntensity: 0.25,
    sunPitch: -40,
    sunYaw: 160,
    fog: '#2b2a24',
    fogStart: 4,
    fogEnd: 16,
    rain: true,
  },
}

const indoorLamp: Readonly<Partial<Record<SpaceId, Lighting['lamp']>>> = {
  bar: { color: '#ffb877', intensity: 2.2, range: 14, at: [0, 2.6, 0] },
  room: { color: '#ffd29a', intensity: 1.8, range: 8, at: [1.2, 2.2, -1.2] },
  story: { color: '#8a93a6', intensity: 0.6, range: 10, at: [0, 3, 0] },
}

// Downtown is the one outdoor space as big as the town: fog never has to hide more than the play area
// (docs/art/README.md, Summer: outdoors start 30 m, end 220 m).
const DOWNTOWN_FOG = { fogStart: 30, fogEnd: 220 } as const

export const lighting = (space: SpaceId, season: Season, weather: Weather): Lighting => {
  const base = outdoor[`${season}:${weather}`]
  if (space === 'downtown') return { ...base, ...DOWNTOWN_FOG }
  const lamp = indoorLamp[space]
  return lamp ? { ...base, sunIntensity: base.sunIntensity * 0.5, fogStart: 40, fogEnd: 90, lamp } : base
}

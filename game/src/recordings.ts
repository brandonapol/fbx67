// The recorded sounds: CC0 field recordings from freesound, each logged in docs/audio/sources.md and built by
// `make generate/audio` (tools/audio.ts) into game/public/audio. A bed loops; a set of takes is one file of short
// one-shots, each slice a [start, length] in seconds. Every recording has a procedural fallback that plays until the
// file arrives, and for good if it never does.
import type { Surface } from './footsteps.ts'
import type { Layer, Soundscape, Spot } from './soundscape.ts'
import type { Rand } from './synth.ts'
import { takes } from './takes.ts'

export const BEDS = ['walla', 'creek', 'spruce', 'rain', 'flood'] as const
export const SHOTS = ['clink', 'screen', 'wood', 'gravel'] as const

export type Bed = (typeof BEDS)[number]
export type Shot = (typeof SHOTS)[number]
export type Clip = Bed | Shot

export type Slice = readonly [start: number, length: number]

// The spots and the footstep surfaces a recorded set of takes stands in for.
export const SPOT_TAKES: Readonly<Partial<Record<Spot, Shot>>> = { clink: 'clink', screen: 'screen' }
export const STEP_TAKES: Readonly<Partial<Record<Surface, Shot>>> = { wood: 'wood', gravel: 'gravel' }

export const fileOf = (clip: Clip): string => `audio/${clip}.webm`

export const urlOf = (clip: Clip, base: string): string => `${base.endsWith('/') ? base : `${base}/`}${fileOf(clip)}`

export const slicesOf = (clip: Shot): readonly Slice[] => takes.slices[clip]

// A bed loops over exactly the length the tool cut, whatever padding the decoder leaves at the end.
export const loopEnd = (clip: Bed, decoded: number): number => Math.min(decoded, takes.seconds[clip])

// Never the same take twice running: a repeated footstep is the first thing an ear catches.
export const pickSlice = (rand: Rand, slices: readonly Slice[], last: number | undefined): number => {
  if (slices.length < 2) return 0
  const i = Math.floor(rand() * (slices.length - 1))
  return last !== undefined && i >= last ? i + 1 : i
}

const bedsOf = (layers: readonly Layer[]): readonly Bed[] => layers.flatMap((l) => (l.kind === 'recording' ? [l.clip] : []))

const surfacesOf = (s: Soundscape): readonly Surface[] => [s.ground.surface, ...s.ground.regions.map((r) => r.surface)]

// Everything a space can play, so its files load on entering it and not before.
export const clipsOf = (s: Soundscape): readonly Clip[] => {
  const spots = [...s.events.map((e) => e.spot), ...(s.arrival ? [s.arrival] : [])]
  const all: readonly (Clip | undefined)[] = [
    ...bedsOf(s.layers),
    ...spots.map((p) => SPOT_TAKES[p]),
    ...surfacesOf(s).map((f) => STEP_TAKES[f]),
  ]
  return [...new Set(all.filter((c): c is Clip => c !== undefined))]
}

// A take's level against the procedural sound it stands in for: takes are normalized to 0.5 peak (SHOT_PEAK in
// tools/audio.ts), the procedural clink peaks near 0.1, a step and the door near 0.3 to 0.5.
export const SHOT_GAIN: Readonly<Record<Shot, number>> = { clink: 0.2, screen: 0.8, wood: 0.6, gravel: 0.5 }

export type ClipState = 'idle' | 'loading' | 'ready' | 'failed'

export type Library = Readonly<{
  get: (clip: Clip) => AudioBuffer | undefined
  want: (clips: readonly Clip[]) => void
  state: (clip: Clip) => ClipState
}>

// Each clip is fetched and decoded once, the first time a space wants it. A clip that fails stays failed: its
// procedural fallback plays for the rest of the session rather than the network being asked again every room.
export const library = (load: (clip: Clip) => Promise<AudioBuffer>): Library => {
  const ready = new Map<Clip, AudioBuffer>()
  const states = new Map<Clip, ClipState>()
  return {
    get: (clip) => ready.get(clip),
    state: (clip) => states.get(clip) ?? 'idle',
    want: (clips) =>
      clips
        .filter((c) => !states.has(c))
        .forEach((c) => {
          states.set(c, 'loading')
          load(c).then(
            (b) => {
              ready.set(c, b)
              states.set(c, 'ready')
            },
            () => states.set(c, 'failed'),
          )
        }),
  }
}

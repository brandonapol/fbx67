import type { SpaceId } from './levels.ts'

// The sound's share of the quality tier (docs/design/quality-tiers.md). The tier is chosen once, for rendering and
// sound together, by the quality switch; this module only says what each tier costs the mixer. Medium is today's mix,
// so high adds nothing to sound yet.
export const QUALITIES = ['low', 'medium', 'high'] as const
export type Quality = (typeof QUALITIES)[number]

// wallaVoices caps every walla in a bed (the bar's 7, the barfight's 6, the hotel's 5); gravelGrains is the noise
// grains in one gravel step. Each walla voice is eleven Web Audio nodes and each grain three.
export type AudioKnobs = Readonly<{ wallaVoices: number; gravelGrains: number }>

export const AUDIO_TIERS: Readonly<Record<Quality, AudioKnobs>> = {
  low: { wallaVoices: 4, gravelGrains: 4 },
  medium: { wallaVoices: 7, gravelGrains: 7 },
  high: { wallaVoices: 7, gravelGrains: 7 },
}

export const DEFAULT_QUALITY: Quality = 'medium'

// A space's beds are built for one tier: a change of tier rebuilds them, crossfading like a change of space.
export const rebuilds = (built: Readonly<{ space: SpaceId; quality: Quality }> | undefined, space: SpaceId, quality: Quality): boolean =>
  !built || built.space !== space || built.quality !== quality

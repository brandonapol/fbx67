import type { Pov } from '../../text-game/src/story.ts'
import { lucy } from './lucy.ts'

export const castIds = ['owen', 'curly', 'wade', 'hank'] as const

export type CastId = (typeof castIds)[number]

export const clipIds = ['idle', 'walk', 'jog', 'run', 'sneak', 'sit', 'sitDrink', 'drink', 'talk', 'wave'] as const

export type ClipId = (typeof clipIds)[number]

export type Activity = 'stand' | 'sit' | 'sitDrink' | 'drink'

export type Motion = Readonly<{ speed: number; sneaking: boolean; activity: Activity; talking: boolean }>

// Paces, in m/s. Jog is the town pace (run held outdoors); run is the sprint clip's own speed, for chases.
export const WALK_SPEED = 1.4
export const JOG_SPEED = 3.5
export const RUN_SPEED = 5.3
// Indoors nobody runs: run held is a brisk walk, kept under JOGGING so the walk clip plays at a rate that matches it.
export const INDOOR_PACE = 1.8
const MOVING = 0.15
const JOGGING = (WALK_SPEED + JOG_SPEED) / 2
const RUNNING = (JOG_SPEED + RUN_SPEED) / 2

// The ground speed each moving clip was authored at, measured from its feet in stance (docs/art/pipeline.md).
const clipSpeed: Partial<Record<ClipId, number>> = { walk: WALK_SPEED, sneak: WALK_SPEED, jog: 4.0, run: RUN_SPEED }

export const castFor = (figureId: string): CastId | undefined =>
  (castIds as readonly string[]).includes(figureId) ? (figureId as CastId) : undefined

export const clipFor = (m: Motion): ClipId => {
  if (m.speed > RUNNING) return 'run'
  if (m.speed > JOGGING) return 'jog'
  if (m.speed > MOVING) return m.sneaking ? 'sneak' : 'walk'
  if (m.activity === 'sit' || m.activity === 'sitDrink') return m.activity
  if (m.talking) return 'talk'
  return m.activity === 'drink' ? 'drink' : 'idle'
}

const clamp = (lo: number, hi: number, x: number): number => Math.min(hi, Math.max(lo, x))

export const playbackRate = (clip: ClipId, speed: number): number => {
  const authored = clipSpeed[clip]
  if (authored === undefined) return 1
  return clip === 'walk' || clip === 'sneak' ? clamp(0.5, 1.6, speed / authored) : clamp(0.7, 1.4, speed / authored)
}

export const clipUrl = (base: string, who: CastId, clip: ClipId): string => `${base}characters/anims/${who}/${clip}.glb`

export const modelUrl = (base: string, who: CastId): string => `${base}characters/${who}.glb`

// Who the player is, by the story's pov(state): the model and clip set, the camera's eye height (the pivot the arm
// hangs from) and the footstep voice (tread: a pitch and a weight). Wade is nineteen, taller and lighter than Owen: a higher eye, a lighter, quicker
// step. Lucy's body is hers, in lucy.ts.
export type Tread = Readonly<{ pitch: number; weight: number }>

export type Body = Readonly<{ cast?: CastId; eye: number; tread: Tread }>

export const bodies: Readonly<Record<Pov, Body>> = {
  owen: { cast: 'owen', eye: 1.7, tread: { pitch: 1, weight: 1 } },
  wade: { cast: 'wade', eye: 1.8, tread: { pitch: 1.15, weight: 0.85 } },
  lucy,
}

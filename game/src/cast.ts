export const castIds = ['owen', 'curly', 'wade', 'hank'] as const

export type CastId = (typeof castIds)[number]

export const clipIds = ['idle', 'walk', 'run', 'sneak', 'sit', 'sitDrink', 'drink', 'talk', 'wave'] as const

export type ClipId = (typeof clipIds)[number]

export type Activity = 'stand' | 'sit' | 'sitDrink' | 'drink'

export type Motion = Readonly<{ speed: number; sneaking: boolean; activity: Activity; talking: boolean }>

export const WALK_SPEED = 1.4
export const RUN_SPEED = 3.5
const MOVING = 0.15
const RUNNING = 2.4

export const castFor = (figureId: string): CastId | undefined =>
  (castIds as readonly string[]).includes(figureId) ? (figureId as CastId) : undefined


export const clipFor = (m: Motion): ClipId => {
  if (m.speed > RUNNING) return 'run'
  if (m.speed > MOVING) return m.sneaking ? 'sneak' : 'walk'
  if (m.activity === 'sit' || m.activity === 'sitDrink') return m.activity
  if (m.talking) return 'talk'
  return m.activity === 'drink' ? 'drink' : 'idle'
}

export const playbackRate = (clip: ClipId, speed: number): number =>
  clip === 'walk' || clip === 'sneak'
    ? Math.min(1.6, Math.max(0.5, speed / WALK_SPEED))
    : clip === 'run'
      ? Math.min(1.4, Math.max(0.7, speed / RUN_SPEED))
      : 1

export const clipUrl = (base: string, who: CastId, clip: ClipId): string => `${base}characters/anims/${who}/${clip}.glb`

export const modelUrl = (base: string, who: CastId): string => `${base}characters/${who}.glb`

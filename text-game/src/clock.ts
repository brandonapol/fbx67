import type { Scene, SceneId } from './types.ts'

// POV switches that overlap in time: Lucy's crash night, then Wade's search starting the same day.
// Listed by scene pair so no other edge in Act 3 gets a pass.
export const clockOverlaps: readonly (readonly [SceneId, SceneId])[] = [
  ['a3_survive_fire', 'a3_search'],
  ['a3_survive_jake', 'a3_search'],
]

const overlaps = (from: SceneId, to: SceneId): boolean => clockOverlaps.some(([a, b]) => a === from && b === to)

export const backwardClock = (from: Scene, to: Scene): string | null =>
  from.clock === undefined || to.clock === undefined || to.clock >= from.clock || overlaps(from.id, to.id)
    ? null
    : `clock runs backward: ${from.id} (${from.clock}) -> ${to.id} (${to.clock})`

import type { State } from '../../text-game/src/types.ts'
import { replay } from '../../text-game/src/engine.ts'
import { place } from '../../text-game/src/story.ts'
import type { SpaceId } from './levels.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import { depthAt } from './highwater.ts'

// The trail through the flooded streets (docs/acts/act1-missions.md, section 1): how fast Wade wades, where the way up
// to the help tent leaves the town and comes back into it, and the walks between the stops searchEli.ts places.

// Wading: no slower than on dry ground up to the knee; above it the pace falls with depth to its slowest at the
// waist, and stays there. Depth is the town map's (highwater.ts, depthAt); a deck he stands on is dry.
export const KNEE = 0.5
export const WAIST = 1.0
export const SLOWEST = 0.45

export const wadePace = (depth: number): number =>
  depth <= KNEE ? 1 : Math.max(SLOWEST, 1 - ((1 - SLOWEST) * (depth - KNEE)) / (WAIST - KNEE))

export const paceAt = (p: Vec, raised: number): number => (raised > 0 ? 1 : wadePace(depthAt(p.z)))

// The story's state one choice back on the path, or none: the scene the player has just left.
const memo = new WeakMap<readonly number[], State | undefined>()

export const before = (path: readonly number[]): State | undefined => {
  if (memo.has(path)) return memo.get(path)
  const prior = (() => {
    try {
      return replay(path).at(-2)
    } catch {
      return undefined
    }
  })()
  memo.set(path, prior)
  return prior
}

// The way up to the help tent: the high ground past Fifth, off the south end of Cushman (docs/town-map.md, helpTent).
// When the story moves to the tent from a scene on the flooded street, Wade wades there on foot and goes up at this
// spot; he comes back down into the town here, facing north.
export const TENT_WAY = vec(3.5, 139.2)
export const FROM_TENT = vec(3.5, 138.6)

export const walksUp = (from: SpaceId, to: SpaceId, path: readonly number[]): boolean => {
  if (from !== 'line' || to !== 'helpTent') return false
  const prior = before(path)
  return prior !== undefined && place(prior) === 'floodedStreet'
}

export const entryFrom = (from: SpaceId, to: SpaceId): Readonly<{ at: Vec; facing: number }> | undefined =>
  from === 'helpTent' && to === 'line' ? { at: FROM_TENT, facing: Math.PI } : undefined

export type Points = readonly (readonly [number, number])[]

// The walks between the stops, from where Wade stands at one to where he stands at the next, along the streets the
// townspeople point him down: off the east end of the line and north to the Ptarmigan's corner; east along Second
// toward Lacey; back west and up Cushman through the gap at the end of the line to the porch short of Third; on to
// the corner of Third. With the errand: up Cushman to the tent, back to the porch, by the boy on Third, and a block
// or two south to Fifth. Then back to the sergeant on the line.
export const LEGS = {
  toMattress: [[6.1, 66.6], [6.1, 60], [5.4, 50], [5.4, 47.9]],
  toWindow: [[6.5, 56], [66, 56], [68, 62.2]],
  toPorch: [[66, 56], [6.1, 56], [6.1, 67.5], [5.6, 88], [2, 91], [2, 93.5], [4.4, 93.5]],
  toBoat: [[3.5, 100], [3, 104], [1, 104]],
  toTent: [[3.5, 100], [3.5, 130], [FROM_TENT.x, FROM_TENT.z]],
  fromTent: [[3.5, 130], [2, 100], [2, 93.5], [4.4, 93.5]],
  toBoy: [[4.4, 100], [6.8, 103.2]],
  toFifth: [[3.5, 112], [3.5, 133], [2.5, 137], [0.9, 137]],
  backFromThird: [[3.5, 100], [3, 80], [-2.6, 72], [-2.6, 70.3]],
  backFromFifth: [[3.5, 130], [3.5, 100], [3, 80], [-2.6, 72], [-2.6, 70.3]],
} as const satisfies Readonly<Record<string, Points>>

import type { Place, State } from '../../text-game/src/types.ts'
import { place } from '../../text-game/src/story.ts'
import type { SpaceId } from './levels.ts'
import { spaces } from './levels.ts'

export type Route = Readonly<{ to: 'space'; space: SpaceId }> | Readonly<{ to: 'menu' }>

export const spaceFor = (p: Place | undefined): SpaceId | undefined =>
  p === undefined ? undefined : Object.values(spaces).find((s) => s.place === p)?.id

export const route = (s: State): Route => {
  const space = spaceFor(place(s))
  return space ? { to: 'space', space } : { to: 'menu' }
}

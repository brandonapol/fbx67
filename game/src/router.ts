import type { Act, Place, State } from '../../text-game/src/types.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { SpaceId } from './levels.ts'
import { spaces } from './levels.ts'

export type Route = Readonly<{ to: 'space'; space: SpaceId }> | Readonly<{ to: 'menu' }>

export const spaceFor = (act: Act, p: Place | undefined): SpaceId | undefined =>
  p === undefined ? undefined : Object.values(spaces).find((s) => s.act === act && s.place === p)?.id

export const route = (s: State): Route => {
  const space = spaceFor(menu(s).act, place(s))
  return space ? { to: 'space', space } : { to: 'menu' }
}

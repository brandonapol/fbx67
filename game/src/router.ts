import type { Act, Place, State } from '../../text-game/src/types.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { SpaceId } from './levels.ts'
import { spaces } from './levels.ts'

export type Route = Readonly<{ to: 'space'; space: SpaceId }> | Readonly<{ to: 'menu' }> | Readonly<{ to: 'text' }>

// A space that names its scenes routes those and nothing else (the café's gossip visits, dottiesCafe.ts).
export const spaceFor = (act: Act, p: Place | undefined): SpaceId | undefined =>
  p === undefined ? undefined : Object.values(spaces).find((s) => !s.scenes && s.act === act && (s.place === p || s.places?.includes(p)))?.id

export const sceneSpace = (s: State): SpaceId | undefined => Object.values(spaces).find((sp) => sp.scenes?.includes(s.scene))?.id

export const route = (s: State, from: SpaceId): Route => {
  const act = menu(s).act
  const space = sceneSpace(s) ?? spaceFor(act, place(s))
  if (space) return { to: 'space', space }
  const here = spaces[from].act
  return here === undefined || here === act ? { to: 'menu' } : { to: 'text' }
}

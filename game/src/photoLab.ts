import type { State } from '../../text-game/src/types.ts'
import { mission, place } from '../../text-game/src/story.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import { LAB_SPOT, spawns } from './eielson.ts'
import { yawOf } from './downtown.ts'

// The photo lab on the base (docs/acts/act2-missions.md, section 1), as its first pass plays it: the story's photo lab
// and records room route to the Eielson blockout. Wade comes in at the lab's front door and walks to the counter's
// open end, where the scene's own menu asks when he goes in (or whether); in the records room the drawers' menu comes
// up. The clerk's lunch, the lockup and the drawers to read are the mission's later passes; nothing here decides what a
// choice does.

// The way to the records room is there to use only where the story's photo lab mission starts.
export const labSpot = (s: State, id: string): boolean => id === LAB_SPOT.id && mission(s)?.id === 'thePhotoLab'

// Where Wade stands at the story's place on the base: its spawn on the base map, facing the way it faces.
export const baseEntry = (s: State): Readonly<{ at: Vec; facing: number }> => {
  const p = spawns.find((x) => x.id === place(s))
  if (!p) throw new Error(`no base spawn for ${s.scene}`)
  return { at: vec(p.x, p.z), facing: yawOf(p.facing) }
}

import type { Place, SceneId } from '../../text-game/src/types.ts'
import { place } from '../../text-game/src/story.ts'
import type { Game } from '../src/prologue.ts'
import type { SpaceId } from '../src/levels.ts'
import { spaces } from '../src/levels.ts'

import type { Step as Act1Step } from './act1Plan.ts'
import { nextStep as act1Step } from './act1Plan.ts'
import { labNext } from '../src/photoLabBot.ts'

export { bands, label } from './act1Plan.ts'

// A step, or a wait for so many seconds of the game: the photo lab run waits out the lab's people.
export type Step = Act1Step | Readonly<{ kind: 'wait'; seconds: number }>

// What a player does next: Act 1's planner, but in the photo lab run its own player (photoLabBot.ts), which times the
// lab's people and searches the drawers by the records room's first choice.
export const nextStep = (g: Game): Step => (g.lab && g.space === 'eielson' ? labNext(g, 'crossCheck') : act1Step(g))

// Act 2 played as the smoke test plays it: from where the Act 1 run reaches Act 2's first scene to Act 3's first
// scene, every choice the first. Act 1's planner says what a player does next (act1Plan.ts, nextStep); act2Plan.test.ts
// proves it headless, and act2.test.ts does the same steps in the browser. The a2_major start the prologue's run opens
// (starts.ts) has spent Eli's trust, which holds the story at dusk or worse at any heat, so its clear band could not be
// captured; on this path Eli still trusts Wade, and the heat alone sets the band.
export const ACT2_FIRST: SceneId = 'a2_major'

export const ACT2_PATH = '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1'

export const ACT3_FIRST: SceneId = 'a3_camp'

// The Act 2 spaces are levels.ts's spaces of that act. The photo lab and its records room route to the Eielson blockout
// (photoLab.ts), and Lucy's kitchen to its room (kitchen.ts); the rest of the act plays as panels over the story
// backdrop, and the run also visits each space from the Act 2 start to sample it.
export const act2Spaces: readonly SpaceId[] = Object.values(spaces)
  .filter((s) => s.act === 'Act 2: Freeze-up')
  .map((s) => s.id)

// A beat is a stretch of the act at one of the story's places: its first scene there is where its frame is captured,
// from the space it plays in. Act 1's beats are its spaces; Act 2's spaces are not built yet, so its beats are its
// places, and a beat's frame moves into its space when a ticket routes that place to one (the photo lab's has).
const at = (g: Game): readonly [SpaceId, Place | undefined] => [g.space, place(g.story)]

export const isBeat = (before: Game | undefined, now: Game): boolean =>
  before === undefined || at(before).some((x, i) => x !== at(now)[i])

// The probe pose each space Act 2 plays in has its frame taken from (src/probe.ts).
export const poseFor: Readonly<Partial<Record<SpaceId, string>>> = {
  story: 'story',
  eielson: 'base',
  kitchen: 'kitchen',
}

// The beats of the run, in order: the first scene at each place on the path.
export const act2Beats: readonly SceneId[] = [
  'a2_major',
  'a2_photos',
  'a2_photos_files',
  'a2_hotel',
  'a2_hotel_set',
  'a2_chiefs',
  'a2_co_ask',
  'a2_co_heist',
  'a2_curly',
  'a2_steak',
  'a2_minto',
  'a2_records',
  'a2_jake',
  'a2_officer',
  'a2_flight',
  'a2_letter_work',
  'a2_heat',
]

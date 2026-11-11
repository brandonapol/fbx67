import type { SceneId } from '../../text-game/src/types.ts'
import type { SpaceId } from '../src/levels.ts'
import { spaces } from '../src/levels.ts'

export { bands, label } from './act1Plan.ts'
// Act 2's planner: Act 1's, with the photo lab run's own player (act2Plan.ts), for the run from Act 2 to Act 3.
export type { Step } from './act2Plan.ts'
export { isBeat, nextStep } from './act2Plan.ts'

// Act 3 played as the smoke test plays it: from where the Act 2 run reaches Act 3's first scene to Act 4's first
// scene, every choice the first. Act 1's planner says what a player does next (act1Plan.ts, nextStep); act3Plan.test.ts
// proves it headless, and act3.test.ts does the same steps in the browser. The a3_camp start the prologue's run opens
// (starts.ts) is another path; this one is the Act 2 run's, so the three act runs are one playthrough, and on it the
// heat alone sets each beat's band.
export const ACT3_FIRST: SceneId = 'a3_camp'

export const ACT3_PATH = Array.from({ length: 47 }, () => 1).join(',')

export const ACT4_FIRST: SceneId = 'a4_news'

// The Act 3 spaces are levels.ts's spaces of that act. No Act 3 scene's place has a space yet, so the act plays as
// panels over the story backdrop, and its beats are its places (act2Plan.ts, isBeat); a space built for an Act 3 place
// joins this list, the run visits it, and docs/perf.md budgets it.
export const act3Spaces: readonly SpaceId[] = Object.values(spaces)
  .filter((s) => s.act === 'Act 3: Deep Winter')
  .map((s) => s.id)

// The probe pose each space Act 3 plays in has its frame taken from (src/probe.ts).
export const poseFor: Readonly<Partial<Record<SpaceId, string>>> = {
  story: 'story',
}

// The beats of the run, in order: the first scene at each place on the path.
export const act3Beats: readonly SceneId[] = [
  'a3_camp',
  'a3_crash',
  'a3_search',
  'a3_arm',
  'a3_home',
  'a3_hangar',
  'a3_eli',
  'a3_rash',
  'a3_rash_safe',
  'a3_joan',
]

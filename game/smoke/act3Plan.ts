import type { SceneId } from '../../text-game/src/types.ts'
import type { SpaceId } from '../src/levels.ts'
import { spaces } from '../src/levels.ts'
import type { Game } from '../src/prologue.ts'
import { nextPress } from '../src/survivalPlay.ts'
import { CRASH_TIME } from '../src/engineOut.ts'
import { skiTarget } from '../src/skiBot.ts'
import type { Step } from './act2Plan.ts'
import { nextStep as act2Step } from './act2Plan.ts'

export { bands, label } from './act1Plan.ts'
export type { Step } from './act2Plan.ts'
export { isBeat } from './act2Plan.ts'

// How long a wait on the night lasts when nothing is under way: the fire burns and the night counts on meanwhile.
export const NIGHT_WAIT = 1

// What a player does next: Act 2's planner (act2Plan.ts), but on the long night the button its steady player presses
// next (survivalPlay.ts, nextPress) as that button's key, or a wait while it lets the night run (to the end of the task
// under way); and on skis, steering for the next point along the route (skiBot.ts). The run still takes every first
// choice: fire first, smoke, and the ridge. The crash before the night plays out: a wait to its end, nothing in it is
// played (engineOut.ts).
export const nextStep = (g: Game): Step => {
  if (g.crash !== undefined) return { kind: 'wait', seconds: Math.max(CRASH_TIME - g.crash, 1 / 30) }
  if (g.night) {
    const id = nextPress(g.night)
    const i = id === undefined ? -1 : (g.panel?.buttons.findIndex((b) => b.id === id) ?? -1)
    return i >= 0 ? { kind: 'key', key: String(i + 1) } : { kind: 'wait', seconds: g.night.doing ? Math.max(g.night.doing.left, 1 / 30) : NIGHT_WAIT }
  }
  if (g.ski) {
    const to = skiTarget(g.ski.route, g.pos)
    return { kind: 'steer', x: to.x, z: to.z, getUp: false }
  }
  return act2Step(g)
}

// Act 3 played as the smoke test plays it: from where the Act 2 run reaches Act 3's first scene to Act 4's first
// scene, every choice the first. Act 1's planner says what a player does next (act1Plan.ts, nextStep); act3Plan.test.ts
// proves it headless, and act3.test.ts does the same steps in the browser. The a3_camp start the prologue's run opens
// (starts.ts) is another path; this one is the Act 2 run's, so the three act runs are one playthrough, and on it the
// heat alone sets each beat's band.
export const ACT3_FIRST: SceneId = 'a3_camp'

export const ACT3_PATH = Array.from({ length: 47 }, () => 1).join(',')

export const ACT4_FIRST: SceneId = 'a4_news'

// The Act 3 spaces are levels.ts's spaces of that act. The crash and the long night play on the wreck's hillside
// (`wreck`, engineOut.ts), the search's ridge on its slope (`search`, skiing.ts); the rest of the act plays as panels
// over the story backdrop, and its beats are its places
// (act2Plan.ts, isBeat). A space built for an Act 3 place joins this list, the run visits it, and docs/perf.md budgets
// it.
export const act3Spaces: readonly SpaceId[] = Object.values(spaces)
  .filter((s) => s.act === 'Act 3: Deep Winter')
  .map((s) => s.id)

// The probe pose each space Act 3 plays in has its frame taken from (src/probe.ts).
export const poseFor: Readonly<Partial<Record<SpaceId, string>>> = {
  story: 'story',
  wreck: 'wreck',
  search: 'search',
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

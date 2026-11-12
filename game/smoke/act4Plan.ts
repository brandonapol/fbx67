import type { SceneId } from '../../text-game/src/types.ts'
import { menu, send } from '../../text-game/src/story.ts'
import type { SpaceId } from '../src/levels.ts'
import type { Game } from '../src/prologue.ts'
import type { Step } from './act3Plan.ts'
import { ACT3_PATH, ACT4_FIRST, nextStep as act3Step } from './act3Plan.ts'

export { bands, label } from './act1Plan.ts'
export type { Step } from './act3Plan.ts'
export { ACT4_FIRST } from './act3Plan.ts'

// Act 4 played as the smoke test plays it: from where the Act 3 run ends, Act 4's first scene, to the end, every choice
// the first but one. Act 3's planner says what a player does next (act3Plan.ts, nextStep); act4Plan.test.ts proves it
// headless, and act4.test.ts does the same steps in the browser. The run opens where the Act 3 run ends, so the four
// act runs are one playthrough.
// (Every choice the first on Act 3's path reaches a4_news after 63 of them; act4Plan.test.ts holds that.)
export const ACT4_PATH = Array.from({ length: 63 }, () => 1).join(',')

export const ACT4_LAST: SceneId = 'end'

// The choice a4_offer takes instead of the first: the third, the wire. The first two (take the money, refuse) never
// reach the backed wire, so the run would skip the set pieces behind it. Asked of the story, not counted: the choice
// whose note leaves `offer` at 'fake', so a reordering of the scene's choices fails act4Plan.test.ts rather than
// quietly playing another one.
export const WIRE_SCENE: SceneId = 'a4_offer'

const wireNote = (g: Game): string | undefined => menu(g.story).options.find((o) => send(g.story, o.note).offer === 'fake')?.note

// What a player does next: Act 3's planner, but at the offer the choice that fakes the deal.
export const nextStep = (g: Game): Step => {
  if (g.story.scene === WIRE_SCENE && g.panel) {
    const note = wireNote(g)
    const at = note === undefined ? -1 : g.panel.buttons.findIndex((b) => b.id === `note:${note}`)
    if (at < 0) throw new Error(`${WIRE_SCENE}: no button takes the choice that fakes the deal (${g.panel.buttons.map((b) => b.id).join(', ')})`)
    return { kind: 'key', key: String(at + 1) }
  }
  return act3Step(g)
}

// A beat is the first scene of the run in each listed scene. Act 4's scenes have no place yet (the story's `place`), so
// the beats are named by scene; when its scenes get places, the list becomes the places, as Act 3's did.
export const act4Beats: readonly SceneId[] = [
  'a4_news',
  'a4_offer',
  'a4_wire',
  'a4_curly',
  'a4_jake',
  'a4_icejam',
  'a4_chase',
  'a4_defuse',
  'a4_testify',
]

export const isBeat = (before: Game | undefined, now: Game): boolean =>
  act4Beats.includes(now.story.scene) && before?.story.scene !== now.story.scene

// Act 4 plays as panels over the story backdrop: it has no space of its own.
export const act4Spaces: readonly SpaceId[] = []

// The probe pose each space Act 4 plays in has its frame taken from (src/probe.ts).
export const poseFor: Readonly<Partial<Record<SpaceId, string>>> = { story: 'story' }

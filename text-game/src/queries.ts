import type { Clock, Evidence, SceneId, State } from './types.ts'
import { sceneOf } from './engine.ts'
import { sceneIndex } from './sceneIds.ts'
import { N } from './names.ts'

// Read-only queries the game asks of the story (see docs/story-api.md, Rule 5). story.ts re-exports them.

export type Season = 'summer' | 'flood' | 'freezeup' | 'winter' | 'breakup'

// Where each season starts, as [month, day]. Dates only, no year: the story runs July 1967 to spring 1968.
// The bands follow the "Band by season" table in docs/art/README.md: flood is August, freeze-up is Sep-Nov,
// winter is Dec-Feb, breakup is spring. The flood starts when the Chena tops its banks (second week of August).
export const SEASON_STARTS: readonly (readonly [Season, number, number])[] = [
  ['winter', 12, 1],
  ['freezeup', 9, 1],
  ['flood', 8, 12],
  ['summer', 6, 1],
  ['breakup', 3, 1],
]

export const seasonOn = (clock: Clock): Season => {
  const [, m, d] = clock.split('T')[0].split('-').map(Number)
  const at = m * 100 + d
  // Walk from the latest start of the year back; before March 1 it is still winter.
  const hit = SEASON_STARTS.find(([, sm, sd]) => at >= sm * 100 + sd)
  return hit?.[0] ?? 'winter'
}

const clockOf = (s: State): Clock | undefined => sceneOf(s).clock

export const season = (s: State): Season | undefined => {
  const c = clockOf(s)
  return c === undefined ? undefined : seasonOn(c)
}

export type Pov = 'owen' | 'wade' | 'lucy'

// Scenes played as Lucy: her Act 2 land-office search and her Act 3 flight. Every other scene after the prologue is
// Wade; the prologue is Owen.
const lucyScenes: ReadonlySet<SceneId> = new Set<SceneId>([
  'a2_records',
  'a2_records_log',
  'a3_camp',
  'a3_wrong_spot',
  'a3_found',
  'a3_crash',
  'a3_survive_fire',
  'a3_survive_jake',
])

export const pov = (s: State): Pov =>
  sceneOf(s).act === 'Prologue' ? 'owen' : lucyScenes.has(s.scene) ? 'lucy' : 'wade'

// Wade's right arm breaks in a3_arm. Nothing yet says when it heals, so it stays broken to the end.
// If the broken-arm design decision (#88) sets a duration, this is the one place it changes.
const BREAK_AT: SceneId = 'a3_arm'

export const oneHanded = (s: State): boolean => sceneIndex(s.scene) >= sceneIndex(BREAK_AT)

export type NotebookEntry = Readonly<{ id: Evidence; line: string }>

// One line per evidence id, saying what was seen, not what it means. `lucy` is used when she is the one reading.
const lines: Readonly<Record<Evidence, Readonly<{ wade: string; lucy?: string }>>> = {
  knot: { wade: `A backward bowline in yellow line, tail outside the loop, cut off ${N.owenShort}'s sawhorse.` },
  bruising: { wade: `${N.joan.split(' ')[0]} saw bruises on ${N.owenShort}'s body from a left hand.` },
  aerialPhotos: { wade: `Aerial photographs of the lower Chatanika, laid next to ${N.owenShort}'s survey grid. The fish camp sits on the best gravel.` },
  hotelTalk: { wade: 'At the hotel bar, a quiet man: "Before is what counts."' },
  coFiles: { wade: `Papers from ${N.co}'s cabinet: sign-outs and copies of his letters. I can't read what they mean.`, lucy: `Papers from ${N.co}'s cabinet: sign-outs and copies of his letters.` },
  curlyKnot: { wade: `${N.curlyShort} tied a tarp off with yellow braided line: a bowline, backward, tail outside the loop.` },
  tapes: { wade: `Four reels of tape in ${N.owenShort}'s hand, from the cache.`, lucy: `Four reels of tape labeled in ${N.owenShort}'s hand, from the cache, with his field notebooks and claim maps.` },
  wreckProof: { wade: "At the wreck: the fuel cap gasket cut, the sump bowl solid ice, the drain jammed with a sliver of wood wired to look clean." },
  curlyLefty: { wade: `${N.curlyShort} had a new hunting bow on him. A left-handed one.` },
  staffCar: { wade: 'An Air Force staff car parked by Jake\'s plane the night before the flight, as Eli saw it.' },
  curlyNamesAshby: { wade: `${N.curlyShort}, in the visiting room: ${N.ashby} paid him.` },
  councilmanFlips: { wade: `Jake told ${N.councilman} about the water in his fuel. ${N.councilman} is going to talk to the Trooper.` },
}

export const evidenceIds = Object.keys(lines) as readonly Evidence[]

export const notebook = (s: State): readonly NotebookEntry[] => {
  const who = pov(s)
  return s.evidence.map((id) => ({ id, line: who === 'lucy' ? (lines[id].lucy ?? lines[id].wade) : lines[id].wade }))
}

// Owen bought the table a round. State doesn't record it; the scene it leads to does, so this holds only there.
export const boughtRound = (s: State): boolean => s.scene === 'p_talk_round'

// The ambient format: the people (and things) the player passes, and every line they say, keyed by trigger. Ambient
// talk never changes plot state; a line can only read it, through `when`. An interaction that must matter is a menu
// note (docs/story-api.md), with its field in state.ts.
import type { Act, Clock, Place, State } from '../types.ts'
import type { Pov } from '../queries.ts'
import { N } from '../names.ts'

export type Topic = 'survey' | 'curly' | 'weather' | 'landOffice'

export type Reaction = 'bump' | 'run' | 'stare'

export type Trigger = 'greet' | 'talk' | 'bark' | 'use' | `askAbout:${Topic}` | `react:${Reaction}`

// Who says a line: the player character (Owen in the prologue, Wade after), the person or thing it belongs to, or a
// narrated aside. The lint holds a player line to the scenes played as that character.
export type Speaker = Pov | 'them' | 'aside'

export type Said = Readonly<{ by: Speaker; text: string }>

// One exchange: one to three lines, an optional reply the player can give, and an optional read of story state.
export type Bit = Readonly<{
  id: string
  lines: readonly Said[]
  reply?: Readonly<{ label: string; lines: readonly Said[] }>
  when?: (s: State) => boolean
}>

// Where and when someone is around: the story's place id and a span of story clock, inclusive. `spot` is a free-form
// town-map label (docs/town-map.md) telling the game where to stand them, e.g. 'secondAvenue' while a walk downtown
// plays at the place it leads to; nothing checks it.
export type Window = Readonly<{ place: Place; from: Clock; to: Clock; spot?: string }>

export type Ambient = Readonly<{
  id: string
  kind: 'person' | 'thing'
  name: string
  at: readonly Window[]
  lines: Partial<Readonly<Record<Trigger, readonly Bit[]>>>
}>

// An overheard thread: lines between ambient people, played in order while the player lingers. `plants` says what it
// sets up and `paysOff` the act where that lands; both are notes for writers, read by nobody at runtime.
export type Thread = Readonly<{
  id: string
  at: Window
  plants: string
  paysOff: Act
  lines: readonly Readonly<{ who: string; text: string }>[]
}>

export const TOPICS: Readonly<Record<Topic, string>> = {
  survey: 'the survey',
  curly: N.curlyShort,
  weather: 'the weather',
  landOffice: 'the land office',
}

export const topicIds = Object.keys(TOPICS) as readonly Topic[]

export const MAX_LINE = 120

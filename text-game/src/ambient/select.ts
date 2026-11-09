// Picking ambient lines: who is here now, which of their lines fit the story so far, and which one comes next.
// Pure reads of State; nothing here returns a State.
import type { State } from '../types.ts'
import { clock, place } from '../story.ts'
import type { Ambient, Bit, Topic, Trigger, Window } from './format.ts'
import { topicIds } from './format.ts'

// Line ids already said, per speaker and trigger, so a line isn't repeated until its pool is spent.
export type Spent = Readonly<Record<string, readonly string[]>>

export const within = (s: State) => (w: Window): boolean => {
  const at = clock(s)
  return place(s) === w.place && at !== undefined && w.from <= at && at <= w.to
}

export const here = (s: State, a: Ambient): boolean => a.at.some(within(s))

export const present = (s: State, cast: readonly Ambient[]): readonly Ambient[] => cast.filter((a) => here(s, a))

// The lines someone has for a trigger right now: none when they aren't here, and only those whose `when` holds.
export const pool = (s: State, a: Ambient, trigger: Trigger): readonly Bit[] =>
  here(s, a) ? (a.lines[trigger] ?? []).filter((b) => b.when?.(s) ?? true) : []

export const topics = (s: State, a: Ambient): readonly Topic[] => topicIds.filter((t) => pool(s, a, `askAbout:${t}`).length > 0)

export const spentKey = (a: Ambient, trigger: Trigger): string => `${a.id}|${trigger}`

// The first line of the pool not yet said; once every line in it has been said, the rotation starts over.
export const say = (s: State, a: Ambient, trigger: Trigger, spent: Spent): Readonly<{ bit: Bit; spent: Spent }> | undefined => {
  const lines = pool(s, a, trigger)
  if (!lines.length) return undefined
  const key = spentKey(a, trigger)
  const used = spent[key] ?? []
  const fresh = lines.filter((b) => !used.includes(b.id))
  const bit = fresh[0] ?? lines[0]
  return { bit, spent: { ...spent, [key]: fresh.length ? [...used, bit.id] : [bit.id] } }
}

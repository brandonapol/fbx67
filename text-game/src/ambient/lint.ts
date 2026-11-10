// The ambient lint: every line follows the story rules and can be heard at some place and time the story reaches.
// Placeholder names are checked on the source text (rendered lines carry names.ts values by design; see
// storyLint.test.ts); everything else on the lines themselves.
import type { State } from '../types.ts'
import { initialState } from '../state.ts'
import { menu, place, send } from '../story.ts'
import { N } from '../names.ts'
import { OIL_PHRASES, lintText } from '../storyLint.ts'
import type { Ambient, Bit, Said, Thread, Trigger } from './format.ts'
import { MAX_LINE } from './format.ts'
import { pool, within } from './select.ts'
import { canonicalKey } from '../liveness.ts'
import { pov } from '../queries.ts'

const fromAct4: ReadonlySet<string> = new Set(['Act 4: Breakup', 'Epilogue'])

// Every state the story reaches at a named place, from the start. Ambient lines are only heard at a place, so the
// walk stops at a scene without one. States are told apart by liveness.ts's canonical key, as in the sweep: a field
// that changes what anyone says, ambient lines included, must be kept there.
export const placedStates = (from: State = initialState): readonly State[] => {
  const seen = new Map<string, State>()
  const go = (s: State): void => {
    const key = canonicalKey(s)
    if (seen.has(key) || place(s) === undefined) return
    seen.set(key, s)
    menu(s).options.forEach((o) => go(send(s, o.note)))
  }
  go(from)
  return [...seen.values()]
}

// Text that was never filled in: an unrendered value, a template hole, a writer's marker.
export const TOKENS: readonly RegExp[] = [/\bundefined\b/, /\bNaN\b/, /\$\{/, /\bTODO\b/, /\bTBD\b/, /XXX/, /\{\{|\}\}/, /\[\[|\]\]/]

const names: ReadonlySet<string> = new Set(Object.values(N))

// A name is from names.ts, or a role name in lower case: "the airman at the jukebox".
const named = (name: string): boolean => names.has(name) || /^(the|a|an) [a-z]/.test(name)

const said = (b: Bit): readonly Said[] => [...b.lines, ...(b.reply?.lines ?? [])]

// The rules on one line of text, heard before Act 4 or not.
const lintLine = (where: string, text: string, early: boolean): readonly string[] => [
  ...(text.trim() === '' ? [`${where}: empty line`] : []),
  ...(text.length > MAX_LINE ? [`${where}: ${text.length} characters, over ${MAX_LINE}`] : []),
  ...TOKENS.filter((re) => re.test(text)).map((re) => `${where}: placeholder token ${re}`),
  ...(early ? OIL_PHRASES.filter((re) => re.test(text)).map((re) => `${where}: oil rule ${re}`) : []),
]

const before4 = (heard: readonly State[]): boolean => heard.some((s) => !fromAct4.has(menu(s).act))

const speakers: ReadonlySet<string> = new Set(['them', 'aside'])

// A line in the player's mouth is said only where the story is played as that player: Wade never speaks for Owen.
const wrongPlayer = (where: string, lines: readonly Said[], heard: readonly State[]): readonly string[] =>
  [...new Set(lines.filter((l) => !speakers.has(l.by)).map((l) => l.by))].flatMap((by) =>
    [...new Set(heard.map(pov))].filter((p) => p !== by).map((p) => `${where}: a line by ${by}, heard where the player is ${p}`),
  )

const lintPerson = (a: Ambient, states: readonly State[]): readonly string[] => [
  ...(named(a.name) ? [] : [`${a.id}: name "${a.name}" is neither in names.ts nor a role name`]),
  ...(Object.entries(a.lines) as [Trigger, readonly Bit[]][]).flatMap(([trigger, bits]) =>
    bits.flatMap((b) => {
      const where = `${a.id} ${trigger} ${b.id}`
      const heard = states.filter((s) => pool(s, a, trigger).includes(b))
      return [
        ...(b.lines.length < 1 || b.lines.length > 3 ? [`${where}: ${b.lines.length} lines, not 1-3`] : []),
        ...(heard.length ? [] : [`${where}: never heard at any place and time the story reaches`]),
        ...said(b).flatMap((l) => lintLine(where, l.text, before4(heard))),
        ...wrongPlayer(where, said(b), heard),
      ]
    }),
  ),
]

const lintThread = (t: Thread, ids: ReadonlySet<string>, states: readonly State[]): readonly string[] => {
  const where = `thread ${t.id}`
  const heard = states.filter((s) => within(s)(t.at))
  return [
    ...(t.lines.length < 2 ? [`${where}: ${t.lines.length} lines; a thread is between two people`] : []),
    ...(heard.length ? [] : [`${where}: never heard at any place and time the story reaches`]),
    ...t.lines.flatMap((l, i) => [
      ...(ids.has(l.who) ? [] : [`${where} line ${i + 1}: "${l.who}" is not in the cast`]),
      ...lintLine(`${where} line ${i + 1}`, l.text, before4(heard)),
    ]),
  ]
}

const duplicates = (ids: readonly string[], what: string): readonly string[] =>
  ids.filter((id, i) => ids.indexOf(id) !== i).map((id) => `duplicate ${what} id ${id}`)

// Every violation in a cast, its threads and the source they are written in; [] when clean. Pass `states` to lint
// against a narrower story than the whole placed walk.
export const lintAmbient = (
  cast: readonly Ambient[],
  threads: readonly Thread[],
  source: string,
  states: readonly State[] = placedStates(),
): readonly string[] => {
  const ids = new Set(cast.map((a) => a.id))
  return [
    ...duplicates(cast.map((a) => a.id), 'ambient'),
    ...duplicates(threads.map((t) => t.id), 'thread'),
    ...cast.flatMap((a) =>
      (Object.entries(a.lines) as [Trigger, readonly Bit[]][]).flatMap(([trigger, bits]) => duplicates(bits.map((b) => `${a.id} ${trigger} ${b.id}`), 'line')),
    ),
    ...lintText(source, false).map((v) => `source line ${v.line}: ${v.match} is a placeholder name; use names.ts`),
    ...cast.flatMap((a) => lintPerson(a, states)),
    ...threads.flatMap((t) => lintThread(t, ids, states)),
  ]
}

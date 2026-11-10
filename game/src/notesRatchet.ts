import { isDeepStrictEqual } from 'node:util'
import type { Act, State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { choicesOf, follow, sceneOf } from '../../text-game/src/engine.ts'
import { canonical } from '../../text-game/src/liveness.ts'
import { mission, noteOf, sendMission } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, press, resume, tick } from './prologue.ts'
import { route } from './router.ts'
import type { SpaceId } from './levels.ts'
import type { Interactable } from './world.ts'
import { angleTo, vec } from './world.ts'

// The parity ratchet (#122): every note an Act 1-3 menu offers has an engine path that sends it, or is on the
// committed allowlist of notes not built yet, game/notes-allowlist.txt, which may only shrink. The notes come from the
// story and the senders from driving the engine; neither is copied here.

export const ACTS: readonly Act[] = ['Act 1: Flood', 'Act 2: Freeze-up', 'Act 3: Deep Winter']

// A note on a scene's menu is `scene:note`; at a mission's start the engine sends the mission's note instead
// (docs/story-api.md, Rule 2), so that is `missionId:note` and the scenes inside the mission send nothing of their own.
export type Offer = Readonly<{ key: string; to: State }>

export type Stop = Readonly<{ state: State; offers: readonly Offer[] }>

export const offersAt = (s: State): readonly Offer[] => {
  const m = mission(s)
  if (m) return m.endings.map((e) => ({ key: `${m.id}:${e.note}`, to: sendMission(s, e.note) }))
  const cs = choicesOf(s)
  return cs.map((c, i) => ({ key: `${s.scene}:${noteOf(i + 1, c.note)}`, to: follow(s, cs, i + 1) }))
}

const COUNTERS = ['heat', 'lucyHeat', 'eliTrust', 'joan', 'momHonesty'] as const satisfies readonly (keyof State)[]

// Two states are one stop when they differ only in the counters, after canonicalization. The counters shade scenes
// but no Act 1-3 menu offers a note by them: walked with them the sweep reaches the same 131 notes from 1.2 million
// states in half a minute, and this walk from about 3,000 states in a fraction of a second.
const stopKey = (s: State): string => {
  const c: Record<string, unknown> = { ...canonical(s) }
  COUNTERS.forEach((k) => delete c[k])
  return JSON.stringify(Object.keys(c).sort().map((k) => [k, c[k]]))
}

const later = (s: State): boolean => !ACTS.includes(sceneOf(s).act) && sceneOf(s).act !== 'Prologue'

// Every Act 1-3 stop the story reaches from the start, breadth first, with the notes its menu offers.
export const walk = (): readonly Stop[] => {
  const seen = new Set<string>()
  const stops: Stop[] = []
  const go = (frontier: readonly State[]): void => {
    if (frontier.length === 0) return
    const next: State[] = []
    frontier.forEach((s) => {
      const k = stopKey(s)
      if (seen.has(k) || later(s)) return
      seen.add(k)
      const offers = offersAt(s)
      if (ACTS.includes(sceneOf(s).act)) stops.push({ state: s, offers })
      offers.forEach((o) => next.push(o.to))
    })
    go(next)
  }
  go([initialState])
  return stops
}

export const storyNotes = (stops: readonly Stop[]): ReadonlySet<string> => new Set(stops.flatMap((s) => s.offers.map((o) => o.key)))

export type Sender = Readonly<{ key: string; space: SpaceId; spot: string }>

// Stands just short of a spot, looking at it, so the engine's own focus picks it.
const facing = (g: Game, i: Interactable): Game => {
  const pos = vec(i.x, i.z - Math.min(0.2, i.r / 2))
  const view = angleTo(pos, i)
  return { ...g, pos, facing: view, view, vel: vec(0, 0) }
}

// Everything one spot leads to: the game after using it, after holding it to the end, and after each button on the
// panels it opens, two panels deep.
const outcomes = (g: Game, depth: number): readonly Game[] => [
  g,
  ...(g.holding ? outcomes(tick(g, { dir: vec(0, 0), hold: true }, g.holding.time + 1e-3), depth) : []),
  ...(g.panel && depth > 0 ? g.panel.buttons.flatMap((b) => outcomes(press(g, b.id), depth - 1)) : []),
]

// The notes the engine sends at this stop: it enters the space the story routes to, uses every spot there, and keeps
// each note whose story the result lands on. A stop with no space only has the fallback menu, which builds nothing.
// `without` leaves spots out, as if the engine had no such spot.
export const sendersAt = (stop: Stop, without: (space: SpaceId, spot: string) => boolean = () => false): readonly Sender[] => {
  const r = route(stop.state, 'story')
  if (r.to !== 'space') return []
  const g = resume(stop.state, [0])
  return available(g)
    .filter((i) => !without(r.space, i.id))
    .flatMap((i) => {
      const at = facing(g, i)
      if (focus(at)?.id !== i.id) throw new Error(`the probe cannot focus ${r.space}/${i.id} at ${stop.state.scene}`)
      const landed = outcomes(interact(at), 2).map((o) => o.story).filter((s) => s !== stop.state)
      return stop.offers.filter((o) => landed.some((s) => isDeepStrictEqual(s, o.to))).map((o) => ({ key: o.key, space: r.space, spot: i.id }))
    })
}

export const engineSenders = (stops: readonly Stop[], without?: (space: SpaceId, spot: string) => boolean): readonly Sender[] =>
  stops.flatMap((s) => sendersAt(s, without))

// One key per line; blank lines and lines from `#` on are ignored.
export const parseAllowlist = (text: string): readonly string[] =>
  text
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean)

// `base` is main's allowlist and `baseMenus` the scenes and missions main's story had. A line not on main's list fails,
// unless its scene or mission is new since main: a new scene the engine has not built yet starts on the list.
export type Ratchet = Readonly<{
  story: ReadonlySet<string>
  sent: ReadonlySet<string>
  allowed: readonly string[]
  base?: readonly string[]
  baseMenus?: ReadonlySet<string>
}>

const menuOf = (key: string): string => key.slice(0, key.indexOf(':'))

// Why the ratchet fails, one line per note; empty when it holds.
export const failures = ({ story, sent, allowed, base, baseMenus }: Ratchet): readonly string[] => {
  const listed = new Set(allowed)
  return [
    ...[...story].filter((k) => !sent.has(k) && !listed.has(k)).map((k) => `${k}: on a story menu, but no engine path sends it`),
    ...allowed.filter((k) => sent.has(k)).map((k) => `${k}: the engine sends it now; delete it from the allowlist`),
    ...allowed.filter((k) => !story.has(k)).map((k) => `${k}: no Act 1-3 menu offers it; delete it from the allowlist`),
    ...allowed.filter((k, i) => allowed.indexOf(k) !== i).map((k) => `${k}: listed twice`),
    ...(base
      ? allowed
          .filter((k) => !base.includes(k) && (baseMenus === undefined || baseMenus.has(menuOf(k))))
          .map((k) => `${k}: not on main's allowlist, which may only shrink`)
      : []),
  ]
}

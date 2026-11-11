import type { Game, Input } from './prologue.ts'
import type { SceneId } from '../../text-game/src/types.ts'
import { available, interact, press, tick } from './prologue.ts'
import type { Points } from './trail.ts'
import { LEGS } from './trail.ts'
import type { Vec } from './world.ts'
import { distance, sub, vec } from './world.ts'

// Drives Wade along the trail headless, tick by tick, the way a player walks it: no position is ever set, and every
// tick's position is kept so a test can check that nothing jumped.

const DT = 1 / 30
const MAX_TICKS = 30 * 300
const STUCK_TICKS = 30

export type Walked = Readonly<{ game: Game; steps: readonly Readonly<{ space: Game['space']; pos: Vec }>[] }>

export const wadeTo = (w: Walked, to: Vec): Walked => {
  const steps = [...w.steps]
  const go = (cur: Game, n: number, idle: number): Game => {
    if (distance(cur.pos, to) < 0.15) return cur
    if (n > MAX_TICKS) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} wading to ${to.x},${to.z}`)
    if (idle > STUCK_TICKS) throw new Error(`blocked at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} wading to ${to.x},${to.z}`)
    const input: Input = { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }
    const next = tick(cur, input, DT)
    steps.push({ space: next.space, pos: next.pos })
    return next.panel ? next : go(next, n + 1, distance(cur.pos, next.pos) < 1e-6 ? idle + 1 : 0)
  }
  return { game: go(w.game, 0, 0), steps }
}

export const wade = (w: Walked, points: Points): Walked => points.reduce((acc, [x, z]) => wadeTo(acc, vec(x, z)), w)

export const start = (game: Game): Walked => ({ game, steps: [{ space: game.space, pos: game.pos }] })

// The walk to each stop of the search from the one before it. Fifth is reached from the tent, by the porch where the
// envelope goes and the boy on Third; the sergeant from wherever Eli was caught up with.
const toStop: Readonly<Record<string, (g: Game) => Points>> = {
  mattress: () => LEGS.toMattress,
  window: () => LEGS.toWindow,
  porch: () => LEGS.toPorch,
  boat: () => LEGS.toBoat,
  tent: () => LEGS.toTent,
  fifth: () => [...LEGS.fromTent, ...LEGS.toBoy, ...LEGS.toFifth],
  sergeant: (g) => (g.pos.z > 120 ? LEGS.backFromFifth : LEGS.backFromThird),
}

// Wades to the stop the story has open in the town and uses it.
export const nextStop = (w: Walked): Walked => {
  const spot = available(w.game)[0]
  const leg = spot && toStop[spot.id]
  if (!leg) throw new Error(`no stop to wade to at ${w.game.story.scene}`)
  const there = wade(w, leg(w.game))
  const used = interact(there.game)
  return { game: used, steps: [...there.steps, { space: used.space, pos: used.pos }] }
}

// At the help tent: walks to Joan, just short of her, and speaks to her.
export const atTent = (w: Walked): Walked => {
  const joan = available(w.game)[0]
  if (w.game.space !== 'helpTent' || !joan) throw new Error(`no one to speak to at the help tent at ${w.game.story.scene}`)
  const there = wade(w, [[joan.x, joan.z + 0.9]])
  const g = interact(there.game)
  return { game: g, steps: [...there.steps, { space: g.space, pos: g.pos }] }
}

// The note a menu takes: its only one, or where it offers more, the first of the notes still to apply that it offers.
const pick = (offered: readonly string[], applies: readonly string[]): string | undefined =>
  offered.length === 1 ? offered[0] : applies.find((n) => offered.includes(n))

// Plays the search on from wherever Wade stands in it, the way a player would, until the story reaches `end`: wades
// to each stop the story opens (up to Joan at the help tent and back) and presses the note the ending applies, or the
// one note a single-option beat offers. Applies and end come from the story's mission (missions.ts), not from here.
export const playSearch = (w: Walked, applies: readonly string[], end: SceneId): Walked => {
  if (w.game.story.scene === end) return w
  if (w.steps.length > MAX_TICKS * 10) throw new Error(`the search never reached ${end}`)
  const panel = w.game.panel
  if (!panel) return playSearch(w.game.space === 'helpTent' ? atTent(w) : nextStop(w), applies, end)
  const offered = panel.buttons.filter((b) => b.id.startsWith('note:')).map((b) => b.id.slice('note:'.length))
  const note = pick(offered, applies)
  if (note === undefined) throw new Error(`${w.game.story.scene} offers ${offered.join(', ')}, none of ${applies.join(', ')}`)
  const g = press(w.game, `note:${note}`)
  const rest = applies.includes(note) ? applies.slice(applies.indexOf(note) + 1) : applies
  return playSearch({ game: g, steps: [...w.steps, { space: g.space, pos: g.pos }] }, rest, end)
}

import type { Game, Input } from './prologue.ts'
import { available, interact, tick } from './prologue.ts'
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

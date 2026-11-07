import type { Game, Input } from './prologue.ts'
import { interact, press, still, tick } from './prologue.ts'
import type { Vec } from './world.ts'
import { distance, sub, vec } from './world.ts'

export const DT = 1 / 30

const MAX_TICKS = 30 * 120

export const walkTo = (g: Game, to: Vec): Game => {
  const go = (cur: Game, n: number): Game => {
    if (distance(cur.pos, to) < 0.15) return cur
    if (n > MAX_TICKS) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} walking to ${to.x},${to.z}`)
    const before = cur.pos
    const next = tick(cur, { dir: sub(to, cur.pos), hold: false }, Math.min(DT, distance(cur.pos, to) / 3.2))
    if (distance(before, next.pos) < 1e-6) throw new Error(`blocked at ${before.x.toFixed(2)},${before.z.toFixed(2)} walking to ${to.x},${to.z}`)
    return next.panel ? next : go(next, n + 1)
  }
  return go(g, 0)
}

export const walk = (g: Game, points: readonly (readonly [number, number])[]): Game =>
  points.reduce((acc, [x, z]) => walkTo(acc, vec(x, z)), g)

export const wait = (g: Game, until: (g: Game) => boolean, input: Input = still): Game => {
  const go = (cur: Game, n: number): Game =>
    until(cur) || cur.panel ? cur : n > MAX_TICKS ? cur : go(tick(cur, input, DT), n + 1)
  return go(g, 0)
}

export const talk = (g: Game, who: 'texas' | 'munitions' | 'round'): Game => {
  const walked = press(g, 'close')
  const at = who === 'round' ? walk(walked, [[-1.5, -2.2]]) : walk(walked, [[1.6, 3.2]])
  const opened = interact(at)
  return press(press(opened, `note:${who}`), 'close')
}

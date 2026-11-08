import type { Game, Input } from './prologue.ts'
import { HIDE_TIME, interact, press, start, still, tick } from './prologue.ts'
import { CURLY_PERIOD } from './levels.ts'
import type { Vec } from './world.ts'
import { distance, sub, vec } from './world.ts'

export const DT = 1 / 30

const MAX_TICKS = 30 * 120

const STUCK_TICKS = 30

export const walkTo = (g: Game, to: Vec): Game => {
  const go = (cur: Game, n: number, idle: number): Game => {
    if (distance(cur.pos, to) < 0.15) return cur
    if (n > MAX_TICKS) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} walking to ${to.x},${to.z}`)
    if (idle > STUCK_TICKS) throw new Error(`blocked at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} walking to ${to.x},${to.z}`)
    const next = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
    return next.panel ? next : go(next, n + 1, distance(cur.pos, next.pos) < 1e-6 ? idle + 1 : 0)
  }
  return go(g, 0, 0)
}

export const walk = (g: Game, points: readonly (readonly [number, number])[]): Game =>
  points.reduce((acc, [x, z]) => walkTo(acc, vec(x, z)), g)

export const wait = (g: Game, until: (g: Game) => boolean, input: Input = still): Game => {
  const go = (cur: Game, n: number): Game =>
    until(cur) || cur.panel ? cur : n > MAX_TICKS ? cur : go(tick(cur, input, DT), n + 1)
  return go(g, 0)
}

export const phase = (g: Game): number => ((g.t % CURLY_PERIOD) + CURLY_PERIOD) % CURLY_PERIOD

export const hold = (g: Game): Game => {
  const started = interact(g)
  if (!started.holding) throw new Error(`nothing to hold at ${g.pos.x.toFixed(2)},${g.pos.z.toFixed(2)}`)
  return wait(started, (cur) => !cur.holding, { dir: vec(0, 0), hold: true })
}

export const holdWhenSafe = (g: Game): Game => hold(wait(g, (cur) => phase(cur) < DT))

const WATCHED = CURLY_PERIOD - 0.9 - HIDE_TIME

export const holdWhenWatched = (g: Game): Game => hold(wait(g, (cur) => phase(cur) > WATCHED && phase(cur) < WATCHED + 3 * DT))

export const routes = {
  stove: [[-6, 2], [-2, -1.5], [5.6, 0.5], [5.6, 0.1]],
  cache: [[-6, 2], [-2, -1.5], [7.5, 0.2], [9.2, 3.2]],
  marker: [[-6, 2], [-2, -1.5], [0, -6], [1.8, -7.5]],
} as const

type Points = readonly (readonly [number, number])[]

export const back = (spot: keyof typeof routes): Points => [...(routes[spot] as Points)].reverse().slice(1).concat([[-7.4, 3.8]])

export const talk = (g: Game, who: 'texas' | 'munitions' | 'round'): Game => {
  const walked = press(g, 'close')
  const at = who === 'round' ? walk(walked, [[-1.5, -2.2]]) : walk(walked, [[1.6, 3.2]])
  const opened = who === 'round' ? hold(at) : press(interact(at), `note:${who}`)
  return press(opened, 'close')
}

export const playPrologue = (who: 'texas' | 'munitions' | 'round', spot: keyof typeof routes): Game => {
  const bar = talk(start(), who)
  const room = interact(walk(bar, [[0, 4.2]]))
  const desk = interact(walk(room, [[1.6, -0.8]]))
  const camp = press(press(desk, 'note:sleep'), 'note:fly')
  const hidden = holdWhenSafe(walk(camp, routes[spot]))
  const home = interact(walk(hidden, back(spot)))
  const skiff = interact(walk(home, [[0.2, 5.4]]))
  return press(skiff, 'note:continue')
}

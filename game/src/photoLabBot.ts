import type { Game, Input } from './prologue.ts'
import { interact, press, still, tick } from './prologue.ts'
import type { Lab, Method } from './photoLab.ts'
import { DRAWERS, SEARCH_TIME, spotter } from './photoLab.ts'
import type { Vec } from './world.ts'
import { distance, sub, vec } from './world.ts'

// A player for the photo lab run (photoLab.ts), reading the live game the way the smoke planner does: it waits where
// nobody looks until the lab's people (whose rounds are data, so it can see them coming) leave it time to get where it
// is going, and goes. The notes ratchet plays every way in and method with it, the mission tests prove each path, and
// the Act 2 smoke run plays its first choices with it.

export type Points = readonly (readonly [number, number])[]

export type LabStep =
  | Readonly<{ kind: 'key'; key: string }>
  | Readonly<{ kind: 'walk'; spot: string; points: Points; yaw: number }>
  | Readonly<{ kind: 'interact'; spot: string; hold: boolean }>
  | Readonly<{ kind: 'wait'; seconds: number }>

// From the counter's open end past it, through the lab hall door, down the hall and in at the records room door.
const IN: Points = [[164.2, 37.0], [165, 39.2], [165, 41], [169.6, 48], [170, 51.2], [170, 53.2]]
// Into the aisle behind the first row of drawers, out of sight of both doors.
export const HIDE = vec(165.5, 60)
const TO_HIDE: Points = [[162.2, 56.3], [162.2, 60], [HIDE.x, HIDE.z]]
// At the index card's drawers, and from the aisle to them.
export const AT_DRAWERS = vec(167.6, 56.7)
const TO_DRAWERS: Points = [[162.2, 60], [162.2, 56.4], [AT_DRAWERS.x, AT_DRAWERS.z]]
// Out of the records room door with the prints.
const OUT: Points = [[169.8, 54], [170, 51.2], [170, 49.4]]

// The pace it plans at, a little under a walk for the turns; how much later than planned it allows itself to be (the
// browser's frames, a menu's keypress), and the slack on top.
const PACE = 1.2
const LATE = 1.3
const MARGIN = 3
const SAMPLE = 0.25

type Leg = Readonly<{ points: Points; stay: number }>

// Where Wade is, and when, along a plan of walks and stays from `from`.
const samples = (from: Vec, legs: readonly Leg[]): readonly Readonly<{ at: Vec; t: number }>[] => {
  const out: { at: Vec; t: number }[] = []
  let at = from
  let t = 0
  legs.forEach((l) => {
    l.points.forEach(([x, z]) => {
      const to = vec(x, z)
      const d = distance(at, to)
      const n = Math.max(1, Math.ceil(d / (PACE * SAMPLE)))
      for (let i = 1; i <= n; i++) out.push({ at: vec(at.x + ((to.x - at.x) * i) / n, at.z + ((to.z - at.z) * i) / n), t: t + (d / PACE) * (i / n) })
      at = to
      t += d / PACE
    })
    for (let s = 0; s <= l.stay; s += SAMPLE) out.push({ at, t: t + s })
    t += l.stay
  })
  return out
}

// Whether nobody would see Wade on this plan, started now, even running late.
export const clear = (lab: Lab, from: Vec, legs: readonly Leg[]): boolean =>
  samples(from, legs).every(({ at, t }) => {
    for (let u = t; u <= t * LATE + MARGIN; u += 0.5) if (spotter(lab.way, lab.clock + u, at)) return false
    return true
  })

const yawTo = (from: Readonly<{ x: number; z: number }>, to: Readonly<{ x: number; z: number }>): number => Math.atan2(to.x - from.x, to.z - from.z)

const walk = (points: Points, look: Vec): LabStep => {
  const [x, z] = points.at(-1)!
  return { kind: 'walk', spot: DRAWERS.id, points, yaw: yawTo({ x, z }, look) }
}

const WAIT: LabStep = { kind: 'wait', seconds: 0.5 }

const near = (a: Vec, b: Vec): boolean => distance(a, b) < 0.6

// What a player does next in the run, searching the drawers by `method`.
export const labNext = (g: Game, method: Method): LabStep => {
  const lab = g.lab
  if (!lab) throw new Error('no photo lab run')
  if (g.panel) {
    const want = g.panel.kind === 'busted' ? 'retry' : `note:${method}`
    const i = g.panel.buttons.findIndex((b) => b.id === want)
    if (i < 0) throw new Error(`${g.story.scene}: no ${want} on ${g.panel.title}`)
    return { kind: 'key', key: String(i + 1) }
  }
  if (g.holding || lab.caught !== undefined) return WAIT
  const ahead = (from: Vec, legs: readonly Leg[]) => clear(lab, from, legs)
  if (lab.phase === 'in') return ahead(g.pos, [{ points: [...IN, ...TO_HIDE], stay: 2 }]) ? walk([...IN, ...TO_HIDE], DRAWERS) : WAIT
  const left = SEARCH_TIME[lab.method ?? method] - lab.searched
  const hide = walk([[162.2, 56.4], ...TO_HIDE.slice(1)], DRAWERS)
  if (near(g.pos, AT_DRAWERS)) {
    if (!ahead(g.pos, [{ points: [], stay: lab.found ? 0 : left }, { points: OUT, stay: 0 }])) return hide
    return lab.found ? walk(OUT, vec(170, 45)) : { kind: 'interact', spot: DRAWERS.id, hold: lab.method !== undefined }
  }
  if (near(g.pos, HIDE)) return ahead(g.pos, [{ points: TO_DRAWERS, stay: lab.found ? 0 : left + 1 }, { points: OUT, stay: 0 }]) ? walk(TO_DRAWERS, DRAWERS) : WAIT
  return hide
}

// --- Played headless, as the mission tests and the notes ratchet do ---

const DT = 1 / 30

const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel && cur.space === g.space; n++) {
    if (n > 30 * 120) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} walking to ${to.x},${to.z}`)
    const input: Input = { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }
    cur = tick(cur, input, DT)
  }
  return cur
}

// Does a step with the same input main.ts would.
export const act = (g: Game, s: LabStep): Game => {
  if (s.kind === 'key') return press(g, g.panel!.buttons[Number(s.key) - 1]!.id)
  if (s.kind === 'interact') {
    const started = interact(g)
    const fill = (cur: Game, n: number): Game => (cur.holding && n < 30 * 60 ? fill(tick(cur, { dir: vec(0, 0), hold: true }, DT), n + 1) : cur)
    return s.hold ? fill(started, 0) : started
  }
  if (s.kind === 'walk') {
    const there = s.points.reduce((cur, [x, z]) => (cur.panel || cur.space !== g.space ? cur : walkTo(cur, vec(x, z))), g)
    return there.panel || there.space !== g.space ? there : tick(there, { ...still, view: s.yaw }, DT)
  }
  const n = Math.max(1, Math.round(s.seconds / DT))
  const wait = (cur: Game, i: number): Game => (i === 0 || cur.panel ? cur : wait(tick(cur, still, DT), i - 1))
  return wait(g, n)
}

// Plays the run from its start to the end of the mission (or `steps` steps), searching by `method`.
export const playLab = (g: Game, method: Method, steps = 2000): Game => {
  let cur = g
  for (let n = 0; cur.lab && cur.space === 'eielson'; n++) {
    if (n > steps) throw new Error(`the photo lab bot is stuck at ${cur.story.scene}, ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}, clock ${cur.lab.clock.toFixed(1)}`)
    cur = act(cur, labNext(cur, method))
  }
  return cur
}

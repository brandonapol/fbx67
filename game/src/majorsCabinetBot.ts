import type { Game } from './prologue.ts'
import { interact, press, still, tick } from './prologue.ts'
import type { Cabinet, GotIn } from './majorsCabinet.ts'
import { COMBINATION, DESK_SPOT, DIAL_SPOT, onRounds } from './majorsCabinet.ts'
import type { LabStep } from './photoLabBot.ts'
import { act } from './photoLabBot.ts'
import type { Vec } from './world.ts'
import { angleTo, distance, sub, vec } from './world.ts'

// A player for the Major's cabinet (majorsCabinet.ts), as the mission tests, the notes ratchet and a person at the
// keyboard play it: in from the hall, a look at the desk, the dial (or the screwdriver), the pages, everything back,
// and out, either at once while the duty airman is still on his round (seen) or after hiding in the dark corner by the
// door through his look in and waiting for him to sit back down (unseen).

export type Seen = 'seen' | 'unseen'

export type Points = readonly (readonly [number, number])[]

const DT = 1 / 30

// In from the hall to the desk; from the desk to the cabinet; from the cabinet out the office door.
export const TO_DESK: Points = [[182, -62], [182, -68.4]]
export const TO_CABINET: Points = [[185, -68.4], [186, -76.6]]
export const OUT: Points = [[185, -68.4], [182, -63], [182, -58]]
// The corner west of the office door, out of the flashlight's reach from the door and the hall.
export const CORNER = vec(175.4, -61.4)
export const TO_CORNER: Points = [[185, -68.4], [176.5, -63], [CORNER.x, CORNER.z]]
export const FROM_CORNER: Points = [[178, -61.5], [182, -61], [182, -58]]

const live = (g: Game, from: Game): boolean => !g.panel && g.cabinet?.caught === undefined && g.space === from.space && g.cabinet !== undefined

export const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && live(cur, g); n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

export const walkThrough = (g: Game, ps: Points): Game => ps.reduce((cur, [x, z]) => walkTo(cur, vec(x, z)), g)

export const faceTo = (g: Game, at: Readonly<{ x: number; z: number }>): Game => tick(g, { ...still, view: angleTo(g.pos, at) }, DT)

// Holds interact on what is in front of him until it is done.
export const holdOn = (g: Game): Game => {
  let cur = interact(g)
  for (let n = 0; cur.holding && n < 30 * 30; n++) cur = tick(cur, { ...still, hold: true }, DT)
  return cur
}

export const waitWhile = (g: Game, keep: (g: Game) => boolean): Game => {
  let cur = g
  for (let n = 0; keep(cur) && live(cur, g); n++) {
    if (n > 30 * 600) throw new Error('waited too long')
    cur = tick(cur, still, DT)
  }
  return cur
}

// The desk, looked over and stepped back from.
export const readDesk = (g: Game): Game => press(interact(faceTo(walkThrough(g, TO_DESK), DESK_SPOT)), 'close')

// Each wheel turned to its number in tens and ones, from 0, and on to the next.
export const dialIn = (g: Game, numbers: readonly number[]): Game =>
  numbers.reduce((cur, n, i) => {
    const turned = [...Array<string>(Math.floor(n / 10)).fill('dial:up10'), ...Array<string>(n % 10).fill('dial:up')].reduce(press, cur)
    return i < numbers.length - 1 ? press(turned, 'dial:next') : turned
  }, g)

// Into the cabinet: the circled date on the dial, or the screwdriver.
export const getIn = (g: Game, how: GotIn): Game => {
  const at = faceTo(walkThrough(g, TO_CABINET), DIAL_SPOT)
  const dial = interact(at)
  return how === 'combo' ? press(dialIn(dial, COMBINATION), 'dial:try') : holdOn(faceTo(press(dial, 'dial:pry'), DIAL_SPOT))
}

// Every page photographed under the flashlight, and everything put back.
export const photograph = (g: Game): Game => {
  let cur = g
  for (let n = 0; cur.cabinet?.phase === 'open' && n < 20; n++) cur = holdOn(faceTo(cur, DIAL_SPOT))
  return cur
}

// --- Step by step, as the Act 2 smoke run and a keyboard play it ---

const yawTo = (from: Readonly<{ x: number; z: number }>, to: Readonly<{ x: number; z: number }>): number => Math.atan2(to.x - from.x, to.z - from.z)

const walk = (points: Points, look: Readonly<{ x: number; z: number }>): LabStep => {
  const [x, z] = points.at(-1)!
  return { kind: 'walk', spot: DIAL_SPOT.id, points, yaw: yawTo({ x, z }, look) }
}

const WAIT: LabStep = { kind: 'wait', seconds: 0.5 }

const at = (g: Game, p: Points): boolean => {
  const [x, z] = p.at(-1)!
  return distance(g.pos, vec(x, z)) < 0.6
}

const key = (g: Game, id: string): LabStep => {
  const i = g.panel!.buttons.findIndex((b) => b.id === id)
  if (i < 0) throw new Error(`${g.story.scene}: no ${id} on ${g.panel!.title}`)
  return { kind: 'key', key: String(i + 1) }
}

// The dial's next button: each wheel turned up to its number in tens then ones, then on to the next, then the handle.
const dialKey = (c: Cabinet): string => {
  const want = COMBINATION[c.wheel]!
  const have = c.dial[c.wheel]!
  if (have === want) return c.wheel < 2 ? 'dial:next' : 'dial:try'
  return want - have >= 10 ? 'dial:up10' : 'dial:up'
}

// What a player does next in the run: in by `how`, out `seen` or not.
export const cabinetNext = (g: Game, how: GotIn, seen: Seen): LabStep => {
  const c = g.cabinet
  if (!c) throw new Error('no cabinet run')
  if (g.panel) {
    if (g.panel.kind === 'busted') return key(g, 'retry')
    if (g.panel.buttons.some((b) => b.id === 'dial:try')) return key(g, how === 'forced' ? 'dial:pry' : dialKey(c))
    return key(g, 'close')
  }
  if (g.holding || c.caught !== undefined) return WAIT
  if (c.phase === 'back') {
    if (seen === 'seen') return walk(OUT, vec(182, -50))
    if (!at(g, TO_CORNER)) return walk(TO_CORNER, vec(182, -59))
    return onRounds(c.clock) ? WAIT : walk(FROM_CORNER, vec(182, -50))
  }
  if (c.phase === 'shut' && !c.read) return at(g, TO_DESK) ? { kind: 'interact', spot: DESK_SPOT.id, hold: false } : walk(TO_DESK, DESK_SPOT)
  // From the hall, in through the door first.
  if (!at(g, TO_CABINET)) return walk(g.pos.z > -61 ? [[182, -62], ...TO_CABINET] : TO_CABINET, DIAL_SPOT)
  return { kind: 'interact', spot: DIAL_SPOT.id, hold: c.phase === 'open' || c.prying === true }
}

// The whole run from where it starts, step by step; seen, the duty desk's beat plays as its menu and is continued (the
// one beat between the getaway and the mission's end, by its only note).
export const playCabinet = (g: Game, how: GotIn, seen: Seen, steps = 400): Game => {
  let cur = g
  for (let n = 0; cur.cabinet && cur.space === 'eielson'; n++) {
    if (n > steps) throw new Error(`the cabinet bot is stuck at ${cur.story.scene}, ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}, clock ${cur.cabinet.clock.toFixed(1)}`)
    cur = act(cur, cabinetNext(cur, how, seen))
  }
  return seen === 'seen' && cur.panel?.buttons.length === 1 && cur.panel.buttons[0]!.id === 'note:continue' ? press(cur, 'note:continue') : cur
}

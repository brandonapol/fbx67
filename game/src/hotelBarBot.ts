import type { Game } from './prologue.ts'
import { interact, still, tick } from './prologue.ts'
import type { SeatId } from './hotelBar.ts'
import { SONG_TIME, seatOf, toNextBeat } from './hotelBar.ts'
import type { Vec } from './world.ts'
import { angleTo, distance, sub, vec } from './world.ts'

// A player for the hotel bar (hotelBar.ts): it walks from the door to a stool, sits, and keeps time, strumming on every
// beat, song after song, until the set is done and the story says what he heard. The notes ratchet plays the booth
// stool and the door stool with it, the mission tests prove both, and the Act 2 smoke run plays the set with it.

export type Points = readonly (readonly [number, number])[]

export type BarStep =
  | Readonly<{ kind: 'walk'; spot: string; points: Points; yaw: number }>
  | Readonly<{ kind: 'interact'; spot: string; hold: false }>
  | Readonly<{ kind: 'wait'; seconds: number }>

// From the door to within reach of each stool, around the tables and the people standing.
export const ROUTES: Readonly<Record<SeatId, Points>> = {
  boothStool: [[-3.0, -1.0], [0.5, 1.6], [2.8, 2.4], [3.1, 3.5]],
  barStool: [[-3.0, -1.0], [-1.0, 1.0]],
  doorStool: [[-2.4, -3.2]],
}

const DT = 1 / 30
// Close enough to a stool's approach to sit down from where he stands.
const NEAR = 0.3

const last = (ps: Points): Vec => vec(ps.at(-1)![0], ps.at(-1)![1])

export const STRUM = 'strum'

// What the player does next in the bar: wait for the beat and strum on it while a song is on; between songs, walk to
// the stool and sit.
export const barNext = (g: Game, seat: SeatId): BarStep => {
  const song = g.bar?.song
  if (song) {
    const n = toNextBeat(g.bar!)
    if (n === undefined) return { kind: 'wait', seconds: SONG_TIME - song.t + DT }
    return n > DT / 2 ? { kind: 'wait', seconds: n } : { kind: 'interact', spot: STRUM, hold: false }
  }
  const s = seatOf(seat)
  const at = last(ROUTES[seat])
  const yaw = angleTo(at, s.at)
  if (distance(g.pos, s.at) > 0.05 && distance(g.pos, at) > NEAR) return { kind: 'walk', spot: seat, points: ROUTES[seat], yaw }
  return { kind: 'interact', spot: seat, hold: false }
}

const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} in the hotel bar`)
    cur = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// Does a step headless, as the smoke planner's act() does.
export const act = (g: Game, s: BarStep): Game => {
  if (s.kind === 'interact') return interact(g)
  if (s.kind === 'walk') {
    const there = s.points.reduce((cur, [x, z]) => (cur.panel ? cur : walkTo(cur, vec(x, z))), g)
    return there.panel ? there : tick(there, { ...still, view: s.yaw }, DT)
  }
  let cur = g
  for (let n = Math.round(s.seconds / DT); n > 0 && !cur.panel; n--) cur = tick(cur, still, DT)
  return cur
}

// Plays the set from wherever Wade is in the bar, on one stool, until the story's next menu opens.
export const playBar = (g: Game, seat: SeatId): Game => {
  let cur = g
  for (let n = 0; cur.bar && !cur.panel; n++) {
    if (n > 2000) throw new Error(`the hotel bar's set did not end: ${cur.story.scene}`)
    cur = act(cur, barNext(cur, seat))
  }
  return cur
}

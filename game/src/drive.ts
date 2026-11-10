import type { Game, Input } from './prologue.ts'
import { place } from '../../text-game/src/story.ts'
import { interact, press, seen, start, still, tick, watchOf } from './prologue.ts'
import { CURLY_PERIOD, LOOK_FROM, clockOf } from './curly.ts'
import { legs } from './downtown.ts'
import { flying } from './flight.ts'
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

// Where Curly is in his routine (curly.ts): seconds into its period, by his own clock.
export const phase = (g: Game): number => {
  const t = clockOf(watchOf(g), g.t)
  return ((t % CURLY_PERIOD) + CURLY_PERIOD) % CURLY_PERIOD
}

export const hold = (g: Game): Game => {
  const started = interact(g)
  if (!started.holding) throw new Error(`nothing to hold at ${g.pos.x.toFixed(2)},${g.pos.z.toFixed(2)}`)
  return wait(started, (cur) => !cur.holding && cur.watch?.caught === undefined, { dir: vec(0, 0), hold: true })
}

// Curly is back at work, not turned to a noise.
const calmNow = (g: Game): boolean => !watchOf(g).alarm

// Holds as Curly goes back to the cans: the whole of his work is ahead before he looks again.
export const holdWhenSafe = (g: Game): Game => hold(wait(g, (cur) => phase(cur) < DT && calmNow(cur)))

// Holds as soon as Curly, looking over the camp, has Owen in view.
export const holdWhenWatched = (g: Game): Game => hold(wait(g, (cur) => seen(cur) && phase(cur) > LOOK_FROM && !watchOf(cur).alarm))

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

// Walks a prologue leg downtown along the town map's route and uses the door at its end.
export const walkLeg = (g: Game): Game => {
  const leg = legs.find((l) => g.space === 'downtown' && l.place === place(g.story))
  if (!leg) throw new Error(`no walk downtown from ${g.space} at ${g.story.scene}`)
  return interact(walk(g, leg.route))
}

export const leaveBar = (bar: Game): Game => interact(walk(bar, [[0, 4.2]]))

// In the boarding house: down the hall from the front door to the foot of the stair, and up.
export const HALL: Points = [[0, 4.5], [0.3, -0.4]]

export const upstairs = (hall: Game): Game => interact(walk(hall, HALL))

export const toHall = (bar: Game): Game => walkLeg(leaveBar(bar))

export const toRoom = (bar: Game): Game => upstairs(toHall(bar))

// At the desk: write the letter, let it type out, fold it and leave it by the door; then to bed.
export const typeOut = (g: Game, n = 0): Game => {
  if (g.panel?.kind !== 'letter') throw new Error(`no letter open in ${g.space}`)
  if (g.panel.buttons[0]?.id === 'fold') return g
  if (n > MAX_TICKS) throw new Error('the letter never finished typing')
  return typeOut(tick(g, still, DT), n + 1)
}

export const writeLetter = (room: Game): Game => press(typeOut(interact(walk(room, [[0.6, -0.4], [0.6, -1.0]]))), 'fold')

// Lies down and sleeps through the fade and the date card, to the morning.
export const toBed = (room: Game): Game => wait(interact(walk(room, [[-0.6, 0.6]])), (g) => g.sleeping === undefined)

// Climbs in at the float and sits through the flight north, to the camp.
export const aboardPlane = (dock: Game): Game => press(dock, 'note:fly')

export const landAtCamp = (aloft: Game): Game => wait(aloft, (cur) => !flying(cur.flight))

export const flyNorth = (dock: Game): Game => landAtCamp(aboardPlane(dock))

export const prologueSteps = (who: 'texas' | 'munitions' | 'round', spot: keyof typeof routes): readonly Game[] => {
  const bar = talk(start(), who)
  const night = leaveBar(bar)
  const hall = walkLeg(night)
  const room = upstairs(hall)
  const desk = interact(walk(room, [[0.6, -1.0]]))
  const folded = writeLetter(room)
  const morning = toBed(folded)
  const dock = walkLeg(morning)
  const aloft = aboardPlane(dock)
  const camp = landAtCamp(aloft)
  const hidden = holdWhenSafe(walk(camp, routes[spot]))
  const home = interact(walk(hidden, back(spot)))
  const below = downstairs(home)
  const street = wadeOut(below)
  const skiff = toSkiff(street)
  const aboard = press(skiff, 'note:continue')
  const end = rideOut(aboard)
  return [bar, night, hall, room, desk, folded, morning, dock, aloft, camp, hidden, home, below, street, skiff, aboard, end]
}

// August: from his room down the stair, along the knee-deep hall and out of the front door onto the porch; along the
// porch to the steps, where the skiff waits; and the ride, which plays itself out to the end card.
export const FLOOD_WALK = {
  room: [[0, 1.8]],
  hall: [[0.2, 2.0], [0, 5.6]],
  porch: [[135.2, 98.5]],
} as const

export const downstairs = (room: Game): Game => interact(walk(room, FLOOD_WALK.room))

export const wadeOut = (hall: Game): Game => interact(walk(hall, FLOOD_WALK.hall))

export const toSkiff = (street: Game): Game => interact(walk(street, FLOOD_WALK.porch))

export const rideOut = (aboard: Game): Game => wait(aboard, () => false)

export const playPrologue = (who: 'texas' | 'munitions' | 'round', spot: keyof typeof routes): Game => prologueSteps(who, spot).at(-1)!

// Where Wade stands in the jail to talk: at the bars, inside the cell, and in front of the desk once he is let out.
export const jailStands = { barnette: vec(-1.95, 0.2), ashby: vec(0.9, 0.1) } as const

// Walks to whoever in the jail is in play and talks to them.
export const jailTalk = (g: Game, who: keyof typeof jailStands): Game => {
  const s = jailStands[who]
  return interact(walk(g, [[s.x, s.z]]))
}

// Where Wade stands in the land office to reach things: by the wet ledger pile, and at the foot of the stair by Lucy.
export const officeStands = { ledgers: vec(-2.5, -2.0), lucy: vec(3.4, -2.4) } as const

// Walks to the pile or to Lucy in the land office and uses what is there.
export const officeReach = (g: Game, at: keyof typeof officeStands): Game => {
  const s = officeStands[at]
  return interact(walk(g, [[s.x, s.z]]))
}

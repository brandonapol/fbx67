import type { Game, Input } from './prologue.ts'
import { press, tick } from './prologue.ts'
import type { Brawl, Opened } from './barfight.ts'
import { ENDS_AT, wade, who } from './barfight.ts'
import { MOOSE_RACK, POOL_TABLE } from './silverPan.ts'
import type { Vec } from './world.ts'
import { distance, normalize, sub, vec } from './world.ts'

// A scripted player for the barfight: from the opening prompt, plays the whole fight through the game's own tick with
// the inputs a player would give, aiming at one ending. The barfight's tests and the parity ratchet (notesRatchet.ts)
// drive every note with it. It reads the fight only to steer, the way a player watches the screen.

export type Plan = Readonly<{ opened: Opened; move: 'shove' | 'rack' | 'bottle'; stood: boolean; redHanded: boolean }>

export const DT = 1 / 30

const plans = (): readonly Plan[] =>
  (['gotUp', 'stayedSeated'] as const).flatMap((opened) =>
    (['shove', 'rack', 'bottle'] as const).flatMap((move) =>
      [true, false].flatMap((stood) => [false, true].map((redHanded) => ({ opened, move, stood, redHanded }))),
    ),
  )

// Every plan, one per note of the mission.
export const PLANS: readonly Plan[] = plans()

export const noteFor = (p: Plan): string => [p.opened, p.move, p.stood ? 'stoodWithEli' : 'leftEli', p.redHanded ? 'redHanded' : 'clean'].join('.')

const none = { shove: false, grab: false, use: false }

const toward = (from: Vec, to: Vec, stop = 0.15): Vec => (distance(from, to) <= stop ? vec(0, 0) : normalize(sub(to, from)))

const go = (from: Vec, to: Vec, stop?: number, verbs = none): Input => ({ dir: toward(from, to, stop), hold: false, verbs })

// Where Wade stands to be out of Eli's way: whichever of two open stretches of floor is further from him, by the
// jukebox or inside the door, each with a clear line to the bar.
const away = (eli: Vec): Vec => [vec(4.2, -1.8), vec(-1.2, 3.8)].reduce((a, b) => (distance(b, eli) > distance(a, eli) ? b : a))

const holdingKind = (b: Brawl): string | undefined => b.fight.things.find((t) => t.id === wade(b).holding)?.kind

// Where he goes once his move is made, or while he has none to make.
const stand = (p: Plan, b: Brawl, verbs = none): Input => {
  const me = wade(b)
  const eli = who(b, 'eli')!
  return p.stood ? go(me.pos, eli.pos, 0.8, verbs) : go(me.pos, away(eli.pos), 0.3, verbs)
}

// To the nearest whole bottle on the bar, and pick it up.
const fetchBottle = (b: Brawl): Input => {
  const me = wade(b)
  const bottle = b.fight.things.filter((t) => t.kind === 'bottle' && !t.by && !t.broken).sort((a, c) => distance(a.pos, me.pos) - distance(c.pos, me.pos))[0]
  if (!bottle) return { dir: vec(0, 0), hold: false, verbs: none }
  const spot = vec(bottle.pos.x, -2.4)
  if (distance(me.pos, spot) < 0.3) return { dir: vec(0, 0), hold: false, verbs: { ...none, grab: true } }
  // South of the pool table, go round its east end first.
  const blocked = me.pos.x < POOL_TABLE.x + 1.5 && me.pos.z > POOL_TABLE.z - 0.7
  return go(me.pos, blocked ? vec(POOL_TABLE.x + 1.7, POOL_TABLE.z + 0.9) : spot, blocked ? 0.3 : 0.2)
}

export const inputFor = (p: Plan, b: Brawl): Input => {
  const f = b.fight
  const me = wade(b)
  const held = holdingKind(b)
  if (me.stance === 'down') return { dir: vec(0, 0), hold: false, verbs: { ...none, shove: true } }
  // The headlights are the warning: let go, or don't.
  if (f.t > ENDS_AT - 4) {
    if (!p.redHanded && held) return { dir: vec(0, 0), hold: false, verbs: { ...none, grab: true } }
    if (p.redHanded && p.move === 'shove' && f.t > ENDS_AT - 1) return stand(p, b, { ...none, shove: true })
    // Red-handed with a room move: a bottle in his hand, out of reach of the punches once he has stood his half.
    if (p.redHanded && p.move !== 'shove') {
      if (!held) return fetchBottle(b)
      if (!p.stood || f.tally.beside >= ENDS_AT / 2 + 1) return go(me.pos, away(who(b, 'eli')!.pos), 0.3)
    }
    return stand(p, b)
  }
  // Red-handed with a room move, once it is made: something in his hand when the law comes in. A man knocked down drops
  // what he holds, so a whole bottle off the bar does.
  const made = p.move === 'bottle' ? f.tally.broke : f.tally.first === 'rack'
  if (p.redHanded && made && !held && f.t > ENDS_AT - 20) return fetchBottle(b)
  if (p.move === 'bottle' && !f.tally.broke) {
    if (held === 'bottle') return { dir: vec(0, 0), hold: false, verbs: { ...none, use: true } }
    return fetchBottle(b)
  }
  if (p.move === 'rack' && f.tally.first !== 'rack') {
    if (held !== 'rack') {
      const spot = vec(MOOSE_RACK.x, MOOSE_RACK.z - 0.4)
      return distance(me.pos, spot) < 0.3 ? { dir: vec(0, 0), hold: false, verbs: { ...none, grab: true } } : go(me.pos, spot, 0.2)
    }
    // Walk the rack into the drunk until he is up against something.
    const man = who(b, 'drunk')!
    return go(me.pos, man.pos, 0)
  }
  return stand(p, b)
}

// From the opening prompt to the cell: the game after the law is in and the notes are sent.
export const playOut = (opening: Game, p: Plan): Game => {
  let g = press(opening, `fight:${p.opened}`)
  while (g.brawl) g = tick(g, inputFor(p, g.brawl), DT)
  return g
}

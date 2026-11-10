import type { Box, Vec } from './world.ts'
import { RADIUS, add, angleBetween, angleTo, distance, hits, length, move, normalize, scale, sub, vec } from './world.ts'

// The grounded combat core (#175): a short fight with a few verbs and no combo system, after the barfight spec
// (docs/acts/act1-missions.md, "The barfight"). Nothing here knows the Silver Pan or the story: a room, its fighters,
// the things in it and a clock come in, and what comes out is the fight, the events to draw and hear, and a tally of
// the few details the spec says shade heat or trust. Sending a note from that tally is the mission's job, not this one.
//
// The verbs are the player's: shove, grab, use (break a bottle on a counter) and get up. The room's moves come out of
// them: shoved into the stove a man is out of it for a while; the rack pulled off the wall keeps men back and pins
// one to a wall; a bottle broken on the bar backs off the men near you. The men around throw the punches.
//
// No game-over. Nobody has health. A man hit enough in a short while goes down and gets up again; the player gets up
// with any verb once he has landed. The fight ends at `endsAt`, however it is going, and only then.

export type Side = 'us' | 'them'

export type Stance = 'up' | 'staggered' | 'held' | 'down' | 'rising' | 'burned' | 'pinned' | 'wary'

export type Fighter = Readonly<{
  id: string
  side: Side
  pos: Vec
  vel: Vec
  facing: number
  stance: Stance
  // Seconds left in the stance; for the player down, the time until he has landed and can get up.
  timer: number
  // Hits taken lately; it bleeds off, and KNOCKDOWN of them puts a man down.
  daze: number
  // Seconds into a punch's windup, while one is coming.
  windup?: number
  // Seconds until this man can throw again.
  cool: number
  // Seconds left in his own shove: mid-shove.
  shoving: number
  // A thing's id or a man's id (by the collar).
  holding?: string
  heldBy?: string
  // Who shoved him last, so a man shoved into the stove is the shover's move.
  shovedBy?: string
  // Whom he goes for; the nearest man on the other side when unset.
  target?: string
  // Throws only once someone has laid a hand on him (Eli: he defends himself and doesn't throw the first punch).
  answers?: true
  struck?: true
}>

export type ThingKind = 'rack' | 'bottle'

export type Thing = Readonly<{ id: string; kind: ThingKind; pos: Vec; by?: string; broken?: true }>

export type Room = Readonly<{
  // Solid: walls and furniture.
  walls: readonly Box[]
  // Solid, and a bottle breaks on one.
  counters: readonly Box[]
  // Solid and hot.
  stove?: Box
  // How fast a sliding man stops, in m/s². Mud is low.
  friction: number
  // Whether running and turning hard puts the player down (the mud floor).
  slips: boolean
}>

export type Tally = Readonly<{
  // A bottle broken at any point.
  broke: boolean
  // The first room move of the player's that landed.
  first?: 'stove' | 'rack'
  // Seconds the player spent within ARM of the man he stands with.
  beside: number
  // Set when the fight ends: holding the rack or a bottle, or mid-shove.
  redHanded?: boolean
}>

export type EventKind = 'shove' | 'whiff' | 'grab' | 'drop' | 'smash' | 'yelp' | 'pin' | 'windup' | 'hit' | 'down' | 'slip' | 'getUp' | 'thud' | 'warning' | 'law'

export type FightEvent = Readonly<{ kind: EventKind; who: string; at: Vec; weight?: number }>

export type Fight = Readonly<{
  t: number
  room: Room
  player: string
  // The man the player stands with, for the tally; none when unset.
  stand?: string
  fighters: readonly Fighter[]
  things: readonly Thing[]
  // The warning (headlights, a siren) and the end (the law through the door), in seconds from the start.
  warnAt: number
  endsAt: number
  over: boolean
  // Hit-stop: seconds the bodies hold still so a hit reads.
  freeze: number
  // This step's events.
  events: readonly FightEvent[]
  tally: Tally
}>

// The player's intent this frame: a direction to walk in (world, length up to one), and which verbs were pressed.
export type Intent = Readonly<{ move: Vec; run: boolean; shove: boolean; grab: boolean; use: boolean }>

export const idle: Intent = { move: vec(0, 0), run: false, shove: false, grab: false, use: false }

export const WALK = 1.8
export const RUN = 3.6
export const ACCEL = 14
// Arm's length: verbs reach this far, and the player stands with someone within it.
export const ARM = 1.2
export const REACH = 1.1
export const SHOVE_CONE = (70 * Math.PI) / 180
export const SHOVE_SPEED = 4.5
export const SHOVE_TIME = 0.45
export const THROW = 1.4
export const STAGGER = 0.6
export const HOLD_TIME = 2.5
export const BURN_TIME = 8
export const RACK_SLOW = 0.45
export const RACK_REACH = 1.4
export const RACK_HALF_WIDTH = 0.9
export const FEAR_RADIUS = 3
export const WARY_TIME = 6
export const PUNCH_WINDUP = 0.5
export const PUNCH_COOL = 1.4
export const HIT_PUSH = 2.4
export const HIT_STAGGER = 0.35
export const HITSTOP = 0.09
export const KNOCKDOWN = 3
export const DAZE_BLEED = 0.25
export const DOWN_TIME = 1.2
export const RISE_TIME = 0.8
export const SLIP_SPEED = 3
export const SLIP_TURN = (100 * Math.PI) / 180
export const SLIP_TIME = 0.6
export const WALL_THUD = 2.5

const dirOf = (a: number): Vec => vec(Math.sin(a), Math.cos(a))

const solids = (r: Room): readonly Box[] => [...r.walls, ...r.counters, ...(r.stove ? [r.stove] : [])]

const byId = (f: Fight, id: string | undefined): Fighter | undefined => f.fighters.find((x) => x.id === id)

const thing = (f: Fight, id: string | undefined): Thing | undefined => f.things.find((x) => x.id === id)

const holds = (f: Fight, who: Fighter, kind: ThingKind): Thing | undefined => {
  const t = thing(f, who.holding)
  return t?.kind === kind ? t : undefined
}

const free = (x: Fighter): boolean => x.stance === 'up'

const standing = (x: Fighter): boolean => x.stance !== 'down' && x.stance !== 'rising'

const put = (f: Fight, x: Fighter): Fight => ({ ...f, fighters: f.fighters.map((y) => (y.id === x.id ? x : y)) })

const putThing = (f: Fight, t: Thing): Fight => ({ ...f, things: f.things.map((y) => (y.id === t.id ? t : y)) })

const emit = (f: Fight, kind: EventKind, who: Fighter, weight?: number): Fight => ({
  ...f,
  events: [...f.events, { kind, who: who.id, at: who.pos, ...(weight !== undefined ? { weight } : {}) }],
})

export const fighter = (id: string, side: Side, pos: Vec, facing = 0, extra: Partial<Fighter> = {}): Fighter => ({
  id,
  side,
  pos,
  vel: vec(0, 0),
  facing,
  stance: 'up',
  timer: 0,
  daze: 0,
  cool: 0,
  shoving: 0,
  ...extra,
})

export const start = (o: Readonly<{ room: Room; player: string; stand?: string; fighters: readonly Fighter[]; things: readonly Thing[]; warnAt: number; endsAt: number }>): Fight => ({
  t: 0,
  freeze: 0,
  over: false,
  events: [],
  tally: { broke: false, beside: 0 },
  ...o,
})

// The man in front within reach to shove or grab: the nearest one inside the cone, on the other side.
export const inFront = (f: Fight, who: Fighter): Fighter | undefined =>
  f.fighters
    .filter((x) => x.side !== who.side && standing(x) && x.stance !== 'burned' && distance(x.pos, who.pos) <= REACH + 0.3)
    .filter((x) => angleBetween(who.facing, angleTo(who.pos, x.pos)) <= SHOVE_CONE)
    .reduce<Fighter | undefined>((best, x) => (!best || distance(x.pos, who.pos) < distance(best.pos, who.pos) ? x : best), undefined)

// Drop whatever is in hand: a thing falls where he stands (a broken bottle is only glass), a man is let go.
const letGo = (f: Fight, who: Fighter): Fight => {
  const t = thing(f, who.holding)
  const man = byId(f, who.holding)
  const g = put(f, { ...who, holding: undefined })
  if (t) return putThing(g, { ...t, by: undefined, pos: who.pos })
  if (man) return put(g, { ...man, heldBy: undefined, stance: man.stance === 'held' ? 'up' : man.stance, timer: 0 })
  return g
}

const shove = (f: Fight, who: Fighter): Fight => {
  const collar = byId(f, who.holding)
  const target = collar ?? inFront(f, who)
  if (!target) return emit(put(f, { ...who, shoving: SHOVE_TIME }), 'whiff', who)
  const facing = angleTo(who.pos, target.pos)
  const speed = SHOVE_SPEED * (collar ? THROW : 1)
  const g = put(collar ? letGo(f, who) : f, { ...who, holding: undefined, facing, shoving: SHOVE_TIME })
  const pushed = byId(g, target.id)!
  const h = put(g, { ...pushed, heldBy: undefined, stance: 'staggered', timer: STAGGER, windup: undefined, vel: scale(dirOf(facing), speed), shovedBy: who.id, struck: true })
  return emit(h, 'shove', target, speed / SHOVE_SPEED)
}

const grabbable = (f: Fight, who: Fighter): Readonly<{ man?: Fighter; thing?: Thing }> => {
  const man = inFront(f, who)
  const t = f.things
    .filter((x) => !x.by && !x.broken && distance(x.pos, who.pos) <= REACH + (x.kind === 'rack' ? 0.4 : 0))
    .reduce<Thing | undefined>((best, x) => (!best || distance(x.pos, who.pos) < distance(best.pos, who.pos) ? x : best), undefined)
  if (man && !man.heldBy && (!t || distance(man.pos, who.pos) <= distance(t.pos, who.pos))) return { man }
  return t ? { thing: t } : {}
}

const grab = (f: Fight, who: Fighter): Fight => {
  if (who.holding) return emit(letGo(f, who), 'drop', who)
  const g = grabbable(f, who)
  if (g.man) {
    const h = put(f, { ...who, holding: g.man.id, facing: angleTo(who.pos, g.man.pos) })
    return emit(put(h, { ...g.man, stance: 'held', heldBy: who.id, timer: HOLD_TIME, windup: undefined, struck: true, vel: vec(0, 0) }), 'grab', g.man)
  }
  if (g.thing) return emit(putThing(put(f, { ...who, holding: g.thing.id }), { ...g.thing, by: who.id }), 'grab', who)
  return f
}

// A counter in reach to break a bottle on.
const atCounter = (f: Fight, who: Fighter): boolean => f.room.counters.some((c) => hits(who.pos, c, REACH))

const use = (f: Fight, who: Fighter): Fight => {
  const bottle = holds(f, who, 'bottle')
  if (!bottle || bottle.broken || !atCounter(f, who)) return f
  const g = putThing(f, { ...bottle, broken: true })
  const scared = g.fighters.filter((x) => x.side !== who.side && standing(x) && distance(x.pos, who.pos) <= FEAR_RADIUS)
  const h = scared.reduce((acc, x) => put(acc, { ...x, stance: x.stance === 'up' ? 'wary' : x.stance, timer: x.stance === 'up' ? WARY_TIME : x.timer, windup: undefined }), g)
  return emit({ ...h, tally: { ...h.tally, broke: true } }, 'smash', who)
}

const getUp = (f: Fight, who: Fighter): Fight => emit(put(f, { ...who, stance: 'rising', timer: RISE_TIME }), 'getUp', who)

// The player's verbs. Down, any of them gets him up once he has landed; otherwise they need him on his feet.
const verbs = (f: Fight, intent: Intent): Fight => {
  const me = byId(f, f.player)!
  const any = intent.shove || intent.grab || intent.use
  if (me.stance === 'down') return any && me.timer <= 0 ? getUp(f, me) : f
  if (!free(me)) return f
  if (intent.shove) return shove(f, me)
  if (intent.grab) return grab(f, me)
  if (intent.use) return use(f, me)
  return f
}

const knockDown = (f: Fight, x: Fighter, kind: EventKind = 'down'): Fight => {
  const g = byId(f, x.heldBy) ? letGo(f, byId(f, x.heldBy)!) : f
  const y = byId(g, x.id)!
  const h = y.holding ? letGo(g, y) : g
  return emit(put(h, { ...byId(h, x.id)!, stance: 'down', timer: kind === 'slip' ? SLIP_TIME : DOWN_TIME, daze: 0, windup: undefined, shoving: 0 }), kind, x)
}

const hit = (f: Fight, from: Fighter, to: Fighter): Fight => {
  const daze = to.daze + 1
  const away = dirOf(angleTo(from.pos, to.pos))
  const g = put(f, { ...to, daze, vel: scale(away, HIT_PUSH), stance: to.stance === 'up' || to.stance === 'wary' ? 'staggered' : to.stance, timer: Math.max(to.timer, HIT_STAGGER), windup: undefined, struck: true })
  const h = emit({ ...g, freeze: HITSTOP }, 'hit', to, daze)
  return daze >= KNOCKDOWN ? knockDown({ ...h, freeze: HITSTOP * 2 }, byId(h, to.id)!) : h
}

const targetOf = (f: Fight, x: Fighter): Fighter | undefined => {
  const named = byId(f, x.target)
  if (named && standing(named)) return named
  return f.fighters
    .filter((y) => y.side !== x.side && standing(y))
    .reduce<Fighter | undefined>((best, y) => (!best || distance(y.pos, x.pos) < distance(best.pos, x.pos) ? y : best), undefined)
}

// Where a man not the player wants to go, and the punch he winds up or lands.
const think = (f: Fight, x: Fighter, dt: number): Readonly<{ f: Fight; want: Vec }> => {
  const me = byId(f, f.player)!
  if (x.stance === 'wary') return { f, want: normalize(sub(x.pos, me.pos)) }
  if (x.stance !== 'up' || (x.answers && !x.struck)) return { f, want: vec(0, 0) }
  const target = targetOf(f, x)
  if (!target) return { f, want: vec(0, 0) }
  const d = distance(x.pos, target.pos)
  const facing = angleTo(x.pos, target.pos)
  const want = d > REACH * 0.85 ? dirOf(facing) : vec(0, 0)
  if (x.windup !== undefined) {
    const w = x.windup + dt
    if (w < PUNCH_WINDUP) return { f: put(f, { ...x, facing, windup: w }), want: vec(0, 0) }
    const g = put(f, { ...x, facing, windup: undefined, cool: PUNCH_COOL })
    return { f: d <= REACH * 1.2 && standing(target) ? hit(g, byId(g, x.id)!, target) : emit(g, 'whiff', x), want: vec(0, 0) }
  }
  if (d <= REACH && x.cool <= 0) return { f: emit(put(f, { ...x, facing, windup: 0 }), 'windup', x), want: vec(0, 0) }
  return { f: put(f, { ...x, facing }), want }
}

const timers = (x: Fighter, dt: number, isPlayer: boolean): Fighter => {
  const timer = x.timer - dt
  const base = { ...x, timer, cool: Math.max(0, x.cool - dt), shoving: Math.max(0, x.shoving - dt), daze: Math.max(0, x.daze - DAZE_BLEED * dt) }
  if (timer > 0) return base
  if (x.stance === 'down' && !isPlayer) return { ...base, stance: 'rising', timer: RISE_TIME }
  if (x.stance === 'down') return base
  if (x.stance === 'up') return base
  return { ...base, stance: 'up', heldBy: undefined, timer: 0 }
}

// A hand on a collar lasts only while the man is still held by it.
const tidy = (f: Fight): Fight =>
  f.fighters.reduce<Fight>((g, x) => {
    const man = byId(g, x.holding)
    const y = byId(g, x.id)!
    if (man && man.heldBy !== x.id) return put(g, { ...y, holding: undefined })
    if (man && man.stance !== 'held') return put(put(g, { ...y, holding: undefined }), { ...man, heldBy: undefined })
    return g
  }, f)

const slide = (v: Vec, friction: number, dt: number): Vec => {
  const s = length(v)
  return s <= friction * dt ? vec(0, 0) : scale(v, (s - friction * dt) / s)
}

const toward = (v: Vec, want: Vec, dt: number): Vec => {
  const d = sub(want, v)
  const l = length(d)
  return l <= ACCEL * dt ? want : add(v, scale(d, (ACCEL * dt) / l))
}

// One man's body for a frame: walking where he wants, or sliding where he was sent, and what he slides into.
const body = (f: Fight, id: string, want: Vec, run: boolean, dt: number): Fight => {
  const x = byId(f, id)!
  if (x.heldBy) {
    const by = byId(f, x.heldBy)!
    return put(f, { ...x, pos: move(by.pos, dirOf(by.facing), 0.8, solids(f.room)), vel: by.vel, facing: by.facing + Math.PI })
  }
  const walking = x.stance === 'up' || x.stance === 'wary'
  const rack = holds(f, x, 'rack')
  const top = (run && !rack ? RUN : WALK) * (rack ? RACK_SLOW : 1)
  const vel = walking ? toward(x.vel, scale(want, top), dt) : slide(x.vel, f.room.friction, dt)
  const speed = length(vel)
  if (speed < 1e-6) return put(f, { ...x, vel })
  const solid = solids(f.room)
  const pos = move(x.pos, vel, speed * dt, solid)
  const stopped = distance(pos, x.pos) < speed * dt * 0.5
  const facing = walking && length(want) > 0.1 ? angleTo(vec(0, 0), want) : x.facing
  const g = put(f, { ...x, pos, vel: stopped ? vec(0, 0) : vel, facing })
  const stove = f.room.stove
  if (!walking && stove && hits(pos, stove, 0.5) && x.stance !== 'burned') {
    const y = byId(g, id)!
    return burnPut(y.holding ? letGo(g, y) : g, id)
  }
  if (!walking && stopped && speed >= WALL_THUD) return emit(g, 'thud', byId(g, id)!, speed)
  return g
}

const burnPut = (f: Fight, id: string): Fight => {
  const x = byId(f, id)!
  const shover = x.shovedBy === f.player && !f.tally.first ? { ...f.tally, first: 'stove' as const } : f.tally
  return emit(put({ ...f, tally: shover }, { ...x, stance: 'burned', timer: BURN_TIME, vel: vec(0, 0), windup: undefined }), 'yelp', x)
}

// The rack keeps men back: anyone on the other side in front of it, within its width, is pushed out to its reach;
// one who can't be (a wall behind him) is pinned there while it holds him.
const rack = (f: Fight, id: string): Fight => {
  const x = byId(f, id)!
  if (!holds(f, x, 'rack') || !standing(x)) return f
  const ahead = dirOf(x.facing)
  return f.fighters.reduce<Fight>((g, y) => {
    if (y.side === x.side || !standing(y) || y.heldBy) return g
    const rel = sub(y.pos, x.pos)
    const along = rel.x * ahead.x + rel.z * ahead.z
    const across = Math.abs(rel.x * ahead.z - rel.z * ahead.x)
    if (along <= 0 || along >= RACK_REACH || across > RACK_HALF_WIDTH) return g
    const pos = move(y.pos, ahead, RACK_REACH - along, solids(g.room))
    const pinned = distance(pos, y.pos) < (RACK_REACH - along) * 0.5
    if (!pinned) return put(g, { ...y, pos, windup: undefined, stance: y.stance === 'pinned' ? 'up' : y.stance })
    if (y.stance === 'pinned') return put(g, { ...y, pos, timer: 0.2 })
    const tally = id === g.player && !g.tally.first ? { ...g.tally, first: 'rack' as const } : g.tally
    return emit(put({ ...g, tally }, { ...y, pos, stance: 'pinned', timer: 0.2, windup: undefined, vel: vec(0, 0) }), 'pin', y)
  }, f)
}

// Two bodies don't share a spot: men on their feet closer than two radii are pushed apart, half each.
const apart = (f: Fight): Fight =>
  f.fighters.reduce<Fight>((g, a, i) =>
    f.fighters.slice(i + 1).reduce<Fight>((h, b0) => {
      const x = byId(h, a.id)!
      const y = byId(h, b0.id)!
      if (x.heldBy || y.heldBy || x.holding === y.id || y.holding === x.id || x.stance === 'down' || y.stance === 'down') return h
      const d = distance(x.pos, y.pos)
      if (d >= 2 * RADIUS) return h
      const n = d > 1e-6 ? normalize(sub(y.pos, x.pos)) : vec(1, 0)
      const push = (2 * RADIUS - d) / 2
      const solid = solids(h.room)
      return put(put(h, { ...x, pos: move(x.pos, scale(n, -1), push, solid) }), { ...y, pos: move(y.pos, n, push, solid) })
    }, g), f)

// Running across the mud and turning hard puts the player down.
const slips = (f: Fight, intent: Intent): Fight => {
  const me = byId(f, f.player)!
  if (!f.room.slips || !intent.run || me.stance !== 'up' || length(me.vel) < SLIP_SPEED || length(intent.move) < 0.5) return f
  const turn = angleBetween(angleTo(vec(0, 0), me.vel), angleTo(vec(0, 0), intent.move))
  return turn >= SLIP_TURN ? knockDown(f, me, 'slip') : f
}

const finish = (f: Fight): Fight => {
  const me = byId(f, f.player)!
  const inHand = thing(f, me.holding)
  return emit({ ...f, over: true, tally: { ...f.tally, redHanded: !!inHand || me.shoving > 0 } }, 'law', me)
}

// One frame of the fight. The clock runs in real seconds through hit-stop; the fight ends at `endsAt` and nothing
// after that moves.
export const step = (f0: Fight, intent: Intent, dt: number): Fight => {
  if (f0.over) return { ...f0, events: [] }
  const t = f0.t + dt
  const f1: Fight = { ...f0, t, events: f0.t < f0.warnAt && t >= f0.warnAt ? [{ kind: 'warning', who: f0.player, at: byId(f0, f0.player)!.pos }] : [] }
  if (t >= f0.endsAt) return finish(f1)
  if (f1.freeze > 0) return { ...f1, freeze: Math.max(0, f1.freeze - dt) }
  const f2 = slips(verbs(f1, intent), intent)
  const f3 = tidy(f2.fighters.reduce<Fight>((g, x) => put(g, timers(byId(g, x.id)!, dt, x.id === g.player)), f2))
  const f4 = f3.fighters.reduce<Fight>((g, x) => {
    if (x.id === g.player) return body(g, x.id, intent.move, intent.run, dt)
    const t2 = think(g, byId(g, x.id)!, dt)
    return body(t2.f, x.id, t2.want, false, dt)
  }, f3)
  const f5 = apart(f4.fighters.reduce<Fight>((g, x) => rack(g, x.id), f4))
  const me = byId(f5, f5.player)!
  const ally = byId(f5, f5.stand)
  const near = ally && distance(me.pos, ally.pos) <= ARM ? dt : 0
  return { ...f5, tally: { ...f5.tally, beside: f5.tally.beside + near } }
}

// The details the spec says shade heat or trust, as the fight saw them: the move (a bottle at any point, else the
// first room move that landed, else bare hands, which is shoving), whether the player stood with his man for at
// least half the fight, and whether the law caught him red-handed. The mission turns these into its note.
export type Details = Readonly<{ move: 'shove' | 'rack' | 'bottle'; stood: boolean; redHanded: boolean }>

export const details = (f: Fight): Details => ({
  move: f.tally.broke ? 'bottle' : f.tally.first === 'rack' ? 'rack' : 'shove',
  stood: f.tally.beside >= f.endsAt / 2,
  redHanded: !!f.tally.redHanded,
})

export const warned = (f: Fight): boolean => f.t >= f.warnAt

import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Fight, Fighter, Intent, Room, Thing } from './combat.ts'
import {
  BURN_TIME,
  DOWN_TIME,
  HITSTOP,
  HIT_PUSH,
  KNOCKDOWN,
  RACK_SLOW,
  RISE_TIME,
  SHOVE_SPEED,
  THROW,
  WALK,
  details,
  fighter,
  idle,
  start,
  step,
} from './combat.ts'
import type { Vec } from './world.ts'
import { distance, length, vec } from './world.ts'
import { ENDS_AT, OPPONENT, PLAYER, WARN_AT, testFight } from './fightSpace.ts'

const DT = 1 / 60
const NORTH = Math.PI

const floor = (o: Partial<Room> = {}): Room => ({ walls: [], counters: [], friction: 8, slips: false, ...o })

// The player at the origin facing north, and whoever else; nobody throws first unless asked to.
const fight = (others: readonly Fighter[], o: Partial<Parameters<typeof start>[0]> = {}): Fight =>
  start({ room: floor(), player: 'me', fighters: [fighter('me', 'us', vec(0, 0), NORTH), ...others], things: [], warnAt: 65, endsAt: 75, ...o })

const calm = (id: string, at: Vec, extra: Partial<Fighter> = {}): Fighter => fighter(id, 'them', at, 0, { answers: true, ...extra })

const run = (f: Fight, secs: number, i: Intent = idle): Fight =>
  Array.from({ length: Math.round(secs / DT) }).reduce<Fight>((g) => step(g, i, DT), f)

const runAll = (f: Fight, secs: number, i: Intent = idle): readonly Fight[] =>
  Array.from({ length: Math.round(secs / DT) }).reduce<readonly Fight[]>((gs, _, k) => [...gs, step(gs[k]!, i, DT)], [f]).slice(1)

const press = (f: Fight, verb: 'shove' | 'grab' | 'use'): Fight => step(f, { ...idle, [verb]: true }, DT)

const who = (f: Fight, id: string): Fighter => f.fighters.find((x) => x.id === id)!

const what = (f: Fight, id: string): Thing => f.things.find((x) => x.id === id)!

const kinds = (f: Fight): readonly string[] => f.events.map((e) => e.kind)

test('shove: the man in front is sent off staggering, the way the player faces, and the player is mid-shove', () => {
  const f = press(fight([calm('a', vec(0, -0.9))]), 'shove')
  const a = who(f, 'a')
  assert.equal(a.stance, 'staggered')
  assert.ok(a.vel.z < -SHOVE_SPEED * 0.9 && Math.abs(a.vel.x) < 1e-6)
  assert.ok(who(f, 'me').shoving > 0)
  assert.deepEqual(kinds(f), ['shove'])
})

test('shove: nobody in front is a whiff, still mid-shove; a man behind is not shoved', () => {
  const f = press(fight([calm('a', vec(0, 0.9))]), 'shove')
  assert.deepEqual(kinds(f), ['whiff'])
  assert.equal(who(f, 'a').stance, 'up')
  assert.ok(who(f, 'me').shoving > 0)
})

test('the mud floor: a shoved man slides further than on a dry one', () => {
  const slid = (friction: number): number => {
    const f = run(press(fight([calm('a', vec(0, -0.9))], { room: floor({ friction }) }), 'shove'), 0.5)
    return distance(who(f, 'a').pos, vec(0, -0.9))
  }
  assert.ok(slid(3) > slid(8) * 1.3, `${slid(3)} vs ${slid(8)}`)
})

test('the mud floor: running and turning hard puts the player down; walking, or a dry floor, does not', () => {
  const sprint: Intent = { ...idle, move: vec(0, -1), run: true }
  const back: Intent = { ...idle, move: vec(0, 1), run: true }
  const turned = (room: Room, i: Intent, j: Intent): Fight => step(run(fight([], { room }), 1, i), j, DT)
  const slipped = turned(floor({ slips: true }), sprint, back)
  assert.equal(who(slipped, 'me').stance, 'down')
  assert.ok(kinds(slipped).includes('slip'))
  assert.equal(who(turned(floor({ slips: false }), sprint, back), 'me').stance, 'up')
  assert.equal(who(turned(floor({ slips: true }), { ...sprint, run: false }, { ...back, run: false }), 'me').stance, 'up')
})

test('use the room: shoved into the hot stove a man yelps and is out of it for a while, and it is the move', () => {
  const room = floor({ stove: { x: 0, z: -2.5, w: 0.8, d: 0.8 } })
  const shoved = press(fight([fighter('a', 'them', vec(0, -0.9))], { room }), 'shove')
  const burned = runAll(shoved, 1).find((g) => kinds(g).includes('yelp'))
  assert.ok(burned)
  assert.equal(who(burned, 'a').stance, 'burned')
  assert.equal(burned.tally.first, 'stove')
  const later = runAll(burned, BURN_TIME - 0.5)
  assert.ok(later.every((g) => !kinds(g).includes('hit') && !kinds(g).includes('windup')))
  assert.equal(details(burned).move, 'shove')
})

test('grab: a man by the collar is held in front of the player and moves with him', () => {
  const f = press(fight([calm('a', vec(0, -0.9))]), 'grab')
  assert.equal(who(f, 'a').stance, 'held')
  assert.equal(who(f, 'me').holding, 'a')
  const walked = run(f, 1, { ...idle, move: vec(1, 0) })
  assert.ok(who(walked, 'me').pos.x > 1)
  assert.ok(distance(who(walked, 'a').pos, who(walked, 'me').pos) < 1)
})

test('grab: a shove from the collar throws him harder than a shove from arm\'s length', () => {
  const thrown = press(press(fight([calm('a', vec(0, -0.9))]), 'grab'), 'shove')
  assert.ok(length(who(thrown, 'a').vel) > SHOVE_SPEED * THROW * 0.95)
  assert.equal(who(thrown, 'me').holding, undefined)
  assert.equal(who(thrown, 'a').heldBy, undefined)
})

test('grab: a held man breaks free after a while', () => {
  const f = run(press(fight([calm('a', vec(0, -0.9))]), 'grab'), 3)
  assert.notEqual(who(f, 'a').stance, 'held')
  assert.equal(who(f, 'me').holding, undefined)
})

test('grab: a bottle is picked up and grab again drops it where he stands', () => {
  const f = fight([], { things: [{ id: 'b', kind: 'bottle', pos: vec(0.5, 0) }] })
  const got = press(f, 'grab')
  assert.equal(who(got, 'me').holding, 'b')
  assert.equal(what(got, 'b').by, 'me')
  const dropped = press(run(got, 0.1), 'grab')
  assert.equal(who(dropped, 'me').holding, undefined)
  assert.equal(what(dropped, 'b').by, undefined)
  assert.ok(kinds(dropped).includes('drop'))
})

test('use the room: the rack pulled off the wall is heavy, and slows the player', () => {
  const f = press(fight([], { things: [{ id: 'r', kind: 'rack', pos: vec(-1.3, 0) }] }), 'grab')
  assert.equal(who(f, 'me').holding, 'r')
  const walked = run(f, 1, { ...idle, move: vec(0, -1), run: true })
  assert.ok(length(who(walked, 'me').vel) <= WALK * RACK_SLOW + 1e-6)
})

test('use the room: the rack keeps a man back and pins him to a wall, and it is the move', () => {
  const wall = { x: 0, z: -2, w: 6, d: 0.3 }
  const f = start({
    room: floor({ walls: [wall] }),
    player: 'me',
    fighters: [fighter('me', 'us', vec(0, 0), NORTH, { holding: 'r' }), fighter('a', 'them', vec(0, -1.4))],
    things: [{ id: 'r', kind: 'rack', pos: vec(0, 0), by: 'me' }],
    warnAt: 65,
    endsAt: 75,
  })
  const pressed = runAll(f, 2, { ...idle, move: vec(0, -1) })
  const pinned = pressed.find((g) => kinds(g).includes('pin'))
  assert.ok(pinned)
  assert.equal(who(pinned, 'a').stance, 'pinned')
  assert.equal(pinned.tally.first, 'rack')
  assert.ok(pressed.every((g) => !kinds(g).includes('hit')))
  assert.equal(details(pinned).move, 'rack')
})

test('use: a bottle broken on the bar backs off the men near the player; away from it, or empty-handed, nothing', () => {
  const counter = { x: 0, z: 0.9, w: 4, d: 0.6 }
  const f = fight([fighter('a', 'them', vec(0, -1.5)), fighter('b', 'them', vec(5, -5))], {
    room: floor({ counters: [counter] }),
    things: [{ id: 'b1', kind: 'bottle', pos: vec(0.3, 0.3) }],
  })
  assert.deepEqual(kinds(press(f, 'use')), [])
  const smashed = press(press(f, 'grab'), 'use')
  assert.ok(what(smashed, 'b1').broken)
  assert.ok(smashed.tally.broke)
  assert.ok(kinds(smashed).includes('smash'))
  assert.equal(who(smashed, 'a').stance, 'wary')
  assert.equal(who(smashed, 'b').stance, 'up')
  const backed = run(smashed, 1)
  assert.ok(distance(who(backed, 'a').pos, vec(0, 0)) > 2)
  assert.equal(details(smashed).move, 'bottle')
  const far = fight([], { room: floor({ counters: [{ ...counter, z: 6 }] }), things: [{ id: 'b1', kind: 'bottle', pos: vec(0.3, 0.3) }] })
  assert.equal(what(press(press(far, 'grab'), 'use'), 'b1').broken, undefined)
})

test('hits land with weight: the bodies hold still a beat, the man is knocked back and staggers', () => {
  const f = fight([fighter('a', 'them', vec(0, -0.9))])
  const frames = runAll(f, 1)
  const i = frames.findIndex((g) => kinds(g).includes('hit'))
  assert.ok(i >= 0)
  const hit = frames[i]!
  assert.equal(hit.freeze, HITSTOP)
  assert.equal(who(hit, 'me').stance, 'staggered')
  assert.ok(length(who(hit, 'me').vel) > HIT_PUSH * 0.9)
  assert.equal(hit.events.find((e) => e.kind === 'hit')?.weight, 1)
  const held = frames[i + 1]!
  assert.deepEqual(who(held, 'me').pos, who(hit, 'me').pos)
  assert.ok(held.t > hit.t)
})

test('get up: knocked down, the player lies there a moment, then any verb gets him up, and that takes a moment', () => {
  const f = fight([], {})
  const down = { ...f, fighters: [fighter('me', 'us', vec(0, 0), NORTH, { stance: 'down', timer: DOWN_TIME })] }
  const early = press(down, 'grab')
  assert.equal(who(early, 'me').stance, 'down')
  const landed = run(down, DOWN_TIME + 0.1)
  assert.equal(who(landed, 'me').stance, 'down')
  ;(['shove', 'grab', 'use'] as const).forEach((v) => {
    const rising = press(landed, v)
    assert.equal(who(rising, 'me').stance, 'rising', v)
    assert.ok(kinds(rising).includes('getUp'))
    assert.equal(who(run(rising, RISE_TIME / 2), 'me').stance, 'rising')
    assert.equal(who(run(rising, RISE_TIME + 0.05), 'me').stance, 'up')
  })
})

test('getting knocked down never ends the fight or the game: it runs to the law however it is going', () => {
  const f = fight([fighter('a', 'them', vec(0, -0.9)), fighter('b', 'them', vec(0.9, 0))])
  const lying = run(f, 80)
  assert.ok(lying.over)
  // Pressing a verb every second: he gets up each time he can, and goes down again.
  const frames = Array.from({ length: Math.round(80 / DT) }).reduce<readonly Fight[]>(
    (gs, _, k) => [...gs, step(gs[k]!, k % 60 === 0 ? { ...idle, use: true } : idle, DT)],
    [f],
  ).slice(1)
  const downs = frames.filter((g) => g.events.some((e) => e.kind === 'down' && e.who === 'me'))
  assert.ok(downs.length >= 2, `down ${downs.length} times`)
  const end = frames.findIndex((g) => g.over)
  assert.ok(frames.slice(0, end).every((g) => !g.over && g.t < 75))
  assert.ok(frames[end]!.t >= 75 && frames[end]!.t < 75 + 2 * DT)
  assert.ok(kinds(frames[end]!).includes('law'))
  assert.equal(frames.filter((g) => kinds(g).includes('law')).length, 1)
})

test(`${KNOCKDOWN} hits close together put a man down; he gets back up on his own`, () => {
  const f = fight([], {
    fighters: [fighter('me', 'us', vec(5, 5)), fighter('a', 'us', vec(0, -0.9), 0, { answers: true }), fighter('b', 'them', vec(0, -1.8), 0, { target: 'a' })],
  })
  const frames = runAll(f, 12)
  const i = frames.findIndex((g) => g.events.some((e) => e.kind === 'down' && e.who === 'a'))
  assert.ok(i >= 0)
  assert.ok(frames.slice(i).some((g) => who(g, 'a').stance === 'up'))
})

test('a man who answers does not throw the first punch, and does once he is hit', () => {
  const f = start({
    room: floor(),
    player: 'me',
    fighters: [fighter('me', 'us', vec(6, 6)), fighter('eli', 'us', vec(0, 0), NORTH, { answers: true }), calm('x', vec(0, -0.9), { answers: undefined, target: 'eli', cool: 5 })],
    things: [],
    warnAt: 65,
    endsAt: 75,
  })
  assert.ok(runAll(f, 4).every((g) => !g.events.some((e) => e.kind === 'windup' && e.who === 'eli')))
  assert.ok(runAll(f, 12).some((g) => g.events.some((e) => e.kind === 'windup' && e.who === 'eli')))
})

test('two men on their feet never stand in one spot', () => {
  const f = run(fight([calm('a', vec(0, -3))]), 3, { ...idle, move: vec(0, -1) })
  assert.ok(distance(who(f, 'me').pos, who(f, 'a').pos) >= 0.69)
})

test('the clock: the warning once at warnAt, the end at endsAt, and nothing moves after', () => {
  const frames = runAll(fight([]), 76)
  const warned = frames.filter((g) => kinds(g).includes('warning'))
  assert.equal(warned.length, 1)
  assert.ok(warned[0]!.t >= 65 && warned[0]!.t < 65 + 2 * DT)
  const last = frames.at(-1)!
  assert.ok(last.over)
  assert.deepEqual(step(last, { ...idle, move: vec(1, 0) }, DT).fighters, last.fighters)
})

test('the tally: red-handed holding a bottle or mid-shove when the law comes in, clean once it is dropped', () => {
  const near = (f: Fight): Fight => ({ ...f, t: 75 - DT / 2 })
  const withBottle = press(fight([], { things: [{ id: 'b', kind: 'bottle', pos: vec(0.5, 0) }] }), 'grab')
  assert.ok(details(step(near(withBottle), idle, DT)).redHanded)
  assert.ok(!details(step(near(press(withBottle, 'grab')), idle, DT)).redHanded)
  assert.ok(details(step(near(press(fight([]), 'shove')), idle, DT)).redHanded)
  assert.ok(!details(step(near(fight([])), idle, DT)).redHanded)
})

test('the tally: stood with his man if within arm\'s reach for at least half the fight; bare hands are shoving', () => {
  const f = (at: Vec): Fight => fight([fighter('eli', 'us', at, 0, { answers: true })], { stand: 'eli', endsAt: 10, warnAt: 8 })
  const close = run(f(vec(0.8, 0)), 10.1)
  assert.ok(close.over)
  assert.deepEqual(details(close), { move: 'shove', stood: true, redHanded: false })
  assert.equal(details(run(f(vec(3, 0)), 10.1)).stood, false)
})

test('the test space: the player and one man against him, on the barfight spec\'s clock, and the man fights', () => {
  const f = testFight()
  assert.deepEqual(f.fighters.map((x) => [x.id, x.side]), [[PLAYER, 'us'], [OPPONENT, 'them']])
  assert.equal(f.warnAt, WARN_AT)
  assert.equal(f.endsAt, ENDS_AT)
  assert.ok(ENDS_AT >= 60 && ENDS_AT <= 90)
  assert.ok(runAll(f, 6).some((g) => g.events.some((e) => e.kind === 'hit' && e.who === PLAYER)))
  assert.ok(run(f, ENDS_AT + 0.1).over)
})

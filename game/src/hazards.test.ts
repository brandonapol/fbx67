import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { floodTown } from '../../text-game/src/ambient/floodTown.ts'
import { startFrom } from './start.ts'
import type { Game, Input } from './prologue.ts'
import { WALK, still, tick } from './prologue.ts'
import { solids, spaces } from './levels.ts'
import { depthAt } from './highwater.ts'
import { KNEE, LEGS, SLOWEST, WAIST, wadePace } from './trail.ts'
import { SECOND_NORTH, takesFeet } from './current.ts'
import type { CheckpointId } from './hazards.ts'
import {
  CHECKPOINTS,
  DEBRIS,
  HOLES,
  LANES,
  SINK,
  SWEEP,
  afloat,
  callOut,
  debrisAt,
  depthOver,
  lastCheckpoint,
  paceThrough,
  retry,
  shove,
  stretchAt,
  sweepFade,
  touching,
} from './hazards.ts'
import { RADIUS, distance, vec } from './world.ts'

const DT = 1 / 30

// The text build's paths (`node src/cli.ts --choices <path>`): the opening scene, and on from it along the search.
const OPENING = [1, 1, 1, 1, 1, 1]
const PATHS: Readonly<Record<string, readonly number[]>> = {
  a1_flood: OPENING,
  a1_track: [...OPENING, 1],
  a1_track_2: [...OPENING, 1, 1],
  a1_couple: [...OPENING, 1, 1, 1],
  a1_errand: [...OPENING, 1, 1, 1, 1],
  a1_trail: [...OPENING, 1, 1, 1, 1, 1],
  deliveredFifth: [...OPENING, 1, 1, 1, 1, 1, 1],
  lineFifth: [...OPENING, 1, 1, 1, 1, 1, 1, 1],
  a1_eli: [...OPENING, 1, 1, 1, 2],
  deliveredThird: [...OPENING, 1, 1, 1, 2, 1],
  lineThird: [...OPENING, 1, 1, 1, 2, 1, 1],
}

const at = (name: string): Game => startFrom(`#path=${PATHS[name]!.join(',')}`, '')

// Out on the street with no menu open, at a point of the town. At the errand the story is at the tent while Wade
// still wades up to it (trail.ts, walksUp).
const wading = (name: string, x: number, z: number): Game => ({ ...at(name), space: 'line', panel: undefined, pos: vec(x, z), vel: vec(0, 0) })

const run = (g: Game, input: Input, seconds: number): Game =>
  Array.from({ length: Math.round(seconds / DT) }).reduce<Game>((cur) => tick(cur, input, DT), g)

// Ticks until the current lets go of him: the tick he is back at the checkpoint.
const untilBack = (g: Game, n = 0): Game => {
  assert.ok(n < 600, 'the fade ends')
  return g.swept === undefined ? g : untilBack(tick(g, still, DT), n + 1)
}

// The walks the townspeople point Wade down, as points every 10 cm.
const trail = Object.values(LEGS).flatMap((leg) =>
  leg.slice(1).flatMap(([x1, z1], i) => {
    const [x0, z0] = leg[i]!
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1)
    return Array.from({ length: n + 1 }, (_, k) => vec(x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n))
  }),
)

test('the scenes are at the stops these paths say', () => {
  const scenes = Object.fromEntries(Object.entries(PATHS).map(([k, p]) => [k, replay(p).at(-1)!.scene]))
  assert.deepEqual(scenes, {
    a1_flood: 'a1_flood',
    a1_track: 'a1_track',
    a1_track_2: 'a1_track_2',
    a1_couple: 'a1_couple',
    a1_errand: 'a1_errand',
    a1_trail: 'a1_trail',
    deliveredFifth: 'a1_delivered',
    lineFifth: 'a1_line',
    a1_eli: 'a1_eli',
    deliveredThird: 'a1_delivered',
    lineThird: 'a1_line',
  })
})

// What is under the water.

test('over a hole the water is deeper by its drop, and only over it', () => {
  HOLES.forEach((h) => {
    assert.equal(depthOver(h.at), depthAt(h.at.z) + h.drop, h.id)
    assert.equal(depthOver(vec(h.at.x + h.r + 0.05, h.at.z)), depthAt(h.at.z), `${h.id}, just off it`)
  })
})

test('the manhole on Second is a stumble to the chest: slowest pace, but the water stands, so it keeps his feet', () => {
  const m = HOLES.find((h) => h.id === 'manhole')!
  assert.ok(m.at.z > SECOND_NORTH)
  assert.ok(depthOver(m.at) > WAIST)
  assert.equal(paceThrough(m.at, 0), SLOWEST)
  assert.equal(paceThrough(vec(m.at.x + 2, m.at.z), 0), wadePace(depthAt(m.at.z)), 'beside it, the street pace')
  assert.ok(!takesFeet(m.at, depthOver(m.at), 0))
})

test('the open cellar north of Second takes his feet where the street beside it does not', () => {
  const c = HOLES.find((h) => h.id === 'cellar')!
  assert.ok(c.at.z < SECOND_NORTH)
  assert.ok(depthAt(c.at.z) < WAIST, 'the street there is short of the waist')
  assert.ok(takesFeet(c.at, depthOver(c.at), 0))
  assert.equal(run(wading('a1_track', c.at.x, c.at.z), still, DT).swept, 0, 'stepping in starts the fade')
})

test('every hazard stands off the trail, so walking where the townspeople point never meets one', () => {
  HOLES.forEach((h) => trail.forEach((p) => assert.ok(distance(p, h.at) > h.r + RADIUS + 0.5, `${h.id} at ${p.x},${p.z}`)))
  DEBRIS.forEach((d) => {
    const l = LANES[d.lane]
    trail
      .filter((p) => p.x >= l.to - d.r - RADIUS && p.x <= l.from + d.r + RADIUS)
      .forEach((p) => assert.ok(Math.abs(p.z - l.z) > d.r + RADIUS + 0.5, `${d.id} at ${p.x},${p.z}`))
  })
  trail.forEach((p) => assert.ok(!takesFeet(p, depthOver(p), 0), `the current at ${p.x},${p.z}`))
})

// What comes down the street.

test('debris drifts west along its lane at the lane speed and starts over at its head', () => {
  assert.ok(LANES.first.speed > LANES.second.speed, 'the river runs; Second creeps')
  DEBRIS.forEach((d) => {
    const l = LANES[d.lane]
    const a = debrisAt(d, 10)
    const b = debrisAt(d, 11)
    if (b.x < a.x) assert.ok(Math.abs(a.x - b.x - l.speed) < 1e-9, `${d.id} moves at ${l.speed} m/s`)
    assert.equal(a.z, l.z)
    const period = (l.from - l.to) / l.speed
    assert.ok(Math.abs(debrisAt(d, 10 + period).x - a.x) < 1e-6, `${d.id} goes round`)
    const s = Array.from({ length: Math.ceil(period) }, (_, t) => debrisAt(d, t).x)
    assert.ok(s.every((x) => x <= l.from && x >= l.to))
  })
})

test('a piece rises out of the water at the head of its lane and goes under at its foot', () => {
  const d = DEBRIS.find((x) => x.id === 'drum')!
  const l = LANES[d.lane]
  const when = (x: number): number => (l.from - x - d.lead) / l.speed
  assert.equal(afloat(d, when(l.from - SINK / 2)), 0.5)
  assert.equal(afloat(d, when(30)), 1)
  assert.ok(afloat(d, when(l.to + 0.2)) < 0.15)
})

test('a piece that meets Wade shoves him clear and along with it, west', () => {
  const d = DEBRIS.find((x) => x.id === 'door')!
  const t = 40
  const c = debrisAt(d, t)
  const p = vec(c.x, c.z + 0.3)
  assert.equal(touching(p, t)?.id, 'door')
  const after = shove(p, t, DT, [])
  assert.ok(distance(after, c) >= d.r + RADIUS - 1e-6, 'clear of it')
  assert.ok(after.z > p.z, 'aside, the way he was from it')
  assert.ok(after.x < p.x, 'and carried west')
  assert.equal(shove(vec(c.x, c.z + 3), t, DT, []).z, c.z + 3, 'a piece he is not touching leaves him be')
})

test('on the street the door shoves Wade standing in its way, and he keeps his feet', () => {
  const d = DEBRIS.find((x) => x.id === 'door')!
  const g = { ...wading('a1_track_2', 30, LANES.second.z + 0.2), t: 0 }
  const t = (debrisAt(d, 0).x - 30.5) / LANES.second.speed
  const stood = run({ ...g, t }, still, 1)
  assert.ok(distance(stood.pos, debrisAt(d, stood.t)) >= d.r + RADIUS - 1e-6)
  assert.ok(stood.pos.z > g.pos.z, 'pushed aside')
  assert.equal(stood.swept, undefined)
})

// The current.

test('the current leans on Wade standing in the moving water and carries him west', () => {
  const g = wading('a1_track', 5.5, 42)
  const after = run(g, still, 1)
  assert.ok(after.pos.x < g.pos.x - 0.1, `carried ${(g.pos.x - after.pos.x).toFixed(2)} m`)
  assert.equal(after.pos.z, g.pos.z)
  assert.equal(after.swept, undefined)
  const south = wading('a1_track', 5.5, 58)
  assert.deepEqual(run(south, still, 1).pos, south.pos, 'south of the curb he stands where he stopped')
})

test('wading on Cushman is unchanged on the trail: the pace is the street water there', () => {
  trail.forEach((p) => {
    if (HOLES.every((h) => distance(p, h.at) > h.r)) assert.equal(paceThrough(p, 0), wadePace(depthAt(p.z)))
  })
  assert.equal(paceThrough(vec(3, 120), 0) * WALK, WALK, 'shin-deep past Third, full pace')
  assert.ok(depthAt(120) < KNEE)
})

// Checkpoints and the retry.

const EXPECT: Readonly<Record<string, CheckpointId>> = {
  a1_flood: 'offLine',
  a1_track: 'offLine',
  a1_track_2: 'mattress',
  a1_couple: 'mattress',
  a1_eli: 'porch',
  a1_errand: 'porch',
  a1_trail: 'tent',
  deliveredThird: 'boatThird',
  lineThird: 'boatThird',
  deliveredFifth: 'boatFifth',
  lineFifth: 'boatFifth',
}

test('the last checkpoint follows the story: off the line, the mattress, the porch, the tent, the boat found', () => {
  Object.entries(EXPECT).forEach(([name, id]) => {
    const p = PATHS[name]!
    assert.equal(lastCheckpoint(replay(p).at(-1)!, p), id, name)
  })
})

test('every checkpoint stands on the trail, in water that keeps his feet', () => {
  Object.entries(CHECKPOINTS).forEach(([id, c]) => {
    assert.ok(trail.some((p) => distance(p, c.at) < 0.05), `${id} is on a walk`)
    assert.ok(!takesFeet(c.at, depthOver(c.at), 0), id)
  })
})

test('swept off his feet: the fade runs, and he is back at the checkpoint with the story just as it was', () => {
  Object.entries(EXPECT).forEach(([name, id]) => {
    const g = wading(name, 5.5, 30)
    const story = g.story
    const path = g.path
    assert.ok(depthAt(30) > WAIST)
    const taken = tick(g, { dir: vec(0, -1), hold: false }, DT)
    assert.equal(taken.swept, 0, `${name}: the current has him`)
    const fading = run(taken, { dir: vec(0, 1), hold: false }, SWEEP / 2)
    assert.deepEqual(fading.pos, taken.pos, 'he does not wade out of it')
    assert.ok(sweepFade(fading.swept) > 0.4 && sweepFade(fading.swept) < 0.6)
    const back = untilBack(fading)
    assert.ok(back.t - taken.t >= SWEEP - 1e-9 && back.t - taken.t < SWEEP + 2 * DT, 'after the fade')
    assert.equal(back.swept, undefined, name)
    assert.equal(sweepFade(back.swept), 0)
    assert.deepEqual(back.pos, CHECKPOINTS[id].at, name)
    assert.equal(back.facing, CHECKPOINTS[id].facing)
    assert.equal(back.busts, g.busts + 1)
    // The story never hears about it (Rule 4): the same state and path, and the text build's state at that path.
    assert.equal(back.story, story)
    assert.equal(back.path, path)
    assert.deepEqual(back.story, replay(PATHS[name]!).at(-1))
    assert.equal(back.space, 'line')
  })
})

test('retry by itself keeps the story and path and lands at the last checkpoint', () => {
  const g = { ...wading('a1_couple', 5.5, 30), swept: 0.5, holding: { id: 'x', progress: 0.2, time: 1 } }
  const r = retry(g)
  assert.equal(r.story, g.story)
  assert.equal(r.path, g.path)
  assert.deepEqual(r.pos, CHECKPOINTS.mattress.at)
  assert.equal(r.holding, undefined)
  assert.deepEqual(r.vel, vec(0, 0))
})

test('the retry walks on from the checkpoint as the trail does: no solids under him', () => {
  Object.values(CHECKPOINTS).forEach((c) => {
    const boxes = solids(spaces.line)
    assert.ok(!boxes.some((b) => Math.abs(c.at.x - b.x) < b.w / 2 && Math.abs(c.at.z - b.z) < b.d / 2))
  })
})

// The neighbors.

test('which stretch of the town Wade is on, by the spot names the story uses', () => {
  assert.equal(stretchAt(vec(30, 56)), 'secondAvenue')
  assert.equal(stretchAt(vec(30, 9)), 'firstAvenue')
  assert.equal(stretchAt(vec(5, 80)), 'cushman')
  assert.equal(stretchAt(vec(80, 30)), 'lacey')
  assert.equal(stretchAt(vec(134, 100)), 'boardingHouse')
  assert.equal(stretchAt(vec(30, 30)), undefined)
})

test("a neighbor's call comes from the story's flood town, word for word, and rotates through their lines", () => {
  const s = replay(PATHS.a1_track_2!).at(-1)!
  const first = callOut(s, vec(30, 56), {})
  assert.ok(first, 'someone on Second calls out')
  const who = floodTown.find((p) => p.id === first.who)!
  assert.ok(who.at.some((w) => w.spot === 'secondAvenue'))
  assert.ok(who.lines.bark?.includes(first.bit), 'the very line the story wrote')
  const again = callOut(s, vec(30, 56), first.spent)
  assert.ok(again)
  assert.ok(floodTown.some((p) => p.lines.bark?.includes(again.bit)))
  assert.equal(callOut(s, vec(30, 30), {}), undefined, 'nobody out in the middle of a block')
  const roof = callOut(s, vec(80, 30), {})
  assert.ok(roof && floodTown.find((p) => p.id === roof.who)!.at.some((w) => w.spot === 'lacey'), 'the family on the roof on Lacey')
})

test('nobody calls out on the street once the story has left it', () => {
  const s = replay([...PATHS.lineThird!, 1]).at(-1)!
  assert.equal(callOut(s, vec(30, 56), {}), undefined)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Game } from './prologue.ts'
import { press, start } from './prologue.ts'
import { CURLY_PERIOD } from './curly.ts'
import { DT, back, hold, jailStands, officeStands, phase, routes, wait, walk, walkTo } from './drive.ts'
import { distance, vec } from './world.ts'

// The bar with the opening story panel closed: Wade free to walk.
const bar = (): Game => press(start(), 'close')

const ticks = (from: Game, to: Game): number => Math.round((to.t - from.t) / DT)

test('walkTo arrives within reach of the point by ticking the game, not by setting a position', () => {
  const g = bar()
  const to = vec(0, 2)
  const there = walkTo(g, to)
  assert.ok(distance(there.pos, to) < 0.15, `ended at ${there.pos.x},${there.pos.z}`)
  assert.ok(ticks(g, there) > 0, 'time passed')
  assert.ok(Math.abs((there.t - g.t) / DT - ticks(g, there)) < 1e-6, 'a whole number of ticks')
  assert.equal(there.space, g.space)
})

test('walkTo from where Wade already stands does nothing', () => {
  const g = bar()
  assert.equal(walkTo(g, g.pos), g)
})

test('walkTo throws, naming where it stuck, when a wall stops Wade', () => {
  assert.throws(() => walkTo(bar(), vec(0, -50)), /blocked at .* walking to 0,-50/)
})

test('walk visits its points in order and ends at the last', () => {
  const g = bar()
  const points = [[0, 2], [1.2, 2]] as const
  const end = walk(g, points)
  assert.ok(distance(end.pos, vec(1.2, 2)) < 0.15)
  const direct = walkTo(g, vec(1.2, 2))
  assert.ok(end.t > direct.t, 'the detour through the first point took longer')
  assert.equal(walk(g, []), g)
})

test('wait returns at the first tick the condition holds, or at once if it already does', () => {
  const g = bar()
  const later = wait(g, (cur) => cur.t - g.t >= 0.5)
  assert.ok(later.t - g.t >= 0.5 && later.t - g.t < 0.5 + DT + 1e-9, `${later.t - g.t}`)
  assert.equal(wait(g, () => true), g)
})

test('wait gives up after two minutes of game time rather than hanging', () => {
  const g = bar()
  const end = wait(g, () => false)
  assert.ok(end.t - g.t > 119 && end.t - g.t < 121, `${end.t - g.t}`)
})

test("Curly's phase stays inside his period and advances with the clock", () => {
  const g = bar()
  const p0 = phase(g)
  assert.ok(p0 >= 0 && p0 < CURLY_PERIOD)
  const p1 = phase(wait(g, (cur) => cur.t - g.t >= 1))
  assert.ok(p1 >= 0 && p1 < CURLY_PERIOD)
  assert.ok(Math.abs(((p1 - p0 + CURLY_PERIOD) % CURLY_PERIOD) - 1) < DT + 1e-9, `${p0} -> ${p1}`)
})

test('hold throws where there is nothing to hold', () => {
  assert.throws(() => hold(bar()), /nothing to hold at 0\.00,3\.00/)
})

test('the way back from each hiding spot is its route reversed, ending at the camp door', () => {
  ;(Object.keys(routes) as (keyof typeof routes)[]).forEach((spot) => {
    const route = routes[spot]
    const way = back(spot)
    assert.equal(way.length, route.length, spot)
    assert.deepEqual(way.at(-1), [-7.4, 3.8])
    assert.deepEqual(way.slice(0, -1), [...route].reverse().slice(1), spot)
    assert.notDeepEqual(way[0], route.at(-1), 'starts one step off the spot')
  })
})

test('the stands to talk from are distinct points', () => {
  assert.ok(distance(jailStands.barnette, jailStands.ashby) > 1)
  assert.ok(distance(officeStands.ledgers, officeStands.lucy) > 1)
})

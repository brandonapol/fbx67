import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startFrom } from './start.ts'
import type { Game } from './prologue.ts'
import { JOG, interact, press } from './prologue.ts'
import { STOPS } from './searchEli.ts'
import type { Walked } from './trailDrive.ts'
import { nextStop, start, wade, wadeTo } from './trailDrive.ts'
import { distance, vec } from './world.ts'

const DT = 1 / 30

// The text build's path to Act 1's opening scene: `node src/cli.ts --choices 1,1,1,1,1,1`.
const opening = (): Game => startFrom('#path=1,1,1,1,1,1', '')

// After hearing the woman out and choosing to find Eli: the mattress stop is open in the town.
const searching = (): Game => press(interact(opening()), 'note:findEli')

const noJumps = (w: Walked) =>
  w.steps.forEach((s, i) => {
    const prev = w.steps[i - 1]
    if (!prev || prev.space !== s.space) return
    assert.ok(distance(s.pos, prev.pos) <= JOG * DT + 1e-6, `jumped ${distance(s.pos, prev.pos).toFixed(3)} m at step ${i}`)
  })

test('start keeps the game and records where Wade stands as the first step', () => {
  const g = opening()
  const w = start(g)
  assert.equal(w.game, g)
  assert.deepEqual(w.steps, [{ space: g.space, pos: g.pos }])
})

test('wadeTo arrives within reach, one recorded tick at a time, with no jumps', () => {
  const w = start(searching())
  const to = vec(w.game.pos.x + 2, w.game.pos.z + 3)
  const there = wadeTo(w, to)
  assert.ok(distance(there.game.pos, to) < 0.15)
  assert.ok(there.steps.length > 1)
  assert.deepEqual(there.steps[0], w.steps[0], 'earlier steps are kept')
  assert.deepEqual(there.steps.at(-1)!.pos, there.game.pos)
  assert.equal(w.steps.length, 1, 'the walk it started from is not changed')
  noJumps(there)
})

test('wadeTo throws, naming where it stuck, when the sandbags stop Wade', () => {
  assert.throws(() => wadeTo(start(searching()), vec(-2, 58)), /blocked at .* wading to -2,58/)
})

test('wade follows its points in order; no points is no walk', () => {
  const w = start(searching())
  const { x, z } = w.game.pos
  const end = wade(w, [[x + 1, z + 1], [x + 1, z + 3]])
  assert.ok(distance(end.game.pos, vec(x + 1, z + 3)) < 0.15)
  noJumps(end)
  assert.equal(wade(w, []), w)
})

test('nextStop wades to the stop the story opens and uses it', () => {
  const g = searching()
  assert.equal(STOPS[g.story.scene], 'mattress')
  const there = nextStop(start(g))
  assert.equal(there.game.story.scene, 'a1_track')
  assert.ok(there.game.panel, "the mattress man's menu is open")
  assert.deepEqual(there.steps.at(-1), { space: there.game.space, pos: there.game.pos })
  noJumps(there)
})

test('nextStop refuses a stop it has no walk to', () => {
  assert.throws(() => nextStop(start(opening())), /no stop to wade to at a1_flood/)
})

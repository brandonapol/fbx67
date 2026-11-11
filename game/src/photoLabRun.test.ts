import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu } from '../../text-game/src/story.ts'
import type { Lab } from './photoLab.ts'
import {
  CAUGHT_TIME,
  COUNTER_LINE,
  DRAIN,
  FILL,
  SEARCH_TIME,
  WATCH,
  arrival,
  baseEntry,
  begin,
  catcher,
  counterNotes,
  found,
  labSpot,
  offLimits,
  pick,
  poseAt,
  restart,
  roundTime,
  scold,
  spotter,
  step,
  wayOf,
} from './photoLab.ts'
import { DRAWERS, LAB, LAB_SPOT, RECORDS } from './eielson.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

// The photo lab run's rules as pure functions (photoLab.ts): who may see Wade where, how the indicator fills and
// drains, the busted beat, the checkpoint a retry goes back to, and which spots and notes the run offers. The played
// paths are in photoLab.test.ts; these pin the branches a played path does not isolate.

const PHOTOS = [...ACT2_PATH.split(',').map(Number), 1]
const at = (path: readonly number[]) => replay(path).at(-1)!
const photos = at(PHOTOS)
const lunchFiles = at([...PHOTOS, 1])
const nightFiles = at([...PHOTOS, 2])

const COUNTER = vec(161.4, 36.8)
const IN_RECORDS = vec(175, 60)
const OUTSIDE = vec(LAB[0] - 20, LAB[2] - 20)

// A spot past the counter and a clock at lunch where someone sees Wade standing there: found by search, so a change
// to the rounds moves it rather than breaking the test.
const seen = ((): Readonly<{ clock: number; pos: Vec }> => {
  for (let clock = 0; clock < 200; clock += 1)
    for (let x = LAB[0] + 1; x < LAB[1]; x += 2)
      for (let z = COUNTER_LINE + 1; z < LAB[3]; z += 2) if (spotter('lunch', clock, vec(x, z))) return { clock, pos: vec(x, z) }
  throw new Error('nobody sees anywhere past the counter at lunch')
})()

test('at the scene the menus are read from: a2_photos is the counter, its two ways in the lunch and key runs', () => {
  assert.equal(photos.scene, 'a2_photos')
  assert.equal(lunchFiles.scene, 'a2_photos_files')
  assert.equal(nightFiles.scene, 'a2_photos_night')
})

test('off limits: at lunch only past the counter, after lockup the whole building, outside it never', () => {
  assert.equal(offLimits('lunch', COUNTER), false, 'the customer side at lunch')
  assert.equal(offLimits('lunch', vec(COUNTER.x, COUNTER_LINE + 0.5)), true, 'just past the counter at lunch')
  assert.equal(offLimits('key', COUNTER), true, 'the customer side after lockup')
  assert.equal(offLimits('lunch', OUTSIDE), false)
  assert.equal(offLimits('key', OUTSIDE), false)
  assert.equal(spotter('lunch', seen.clock, COUNTER), undefined, 'nobody spots him where he may stand')
})

test('the indicator fills in FILL seconds of being seen and drains in DRAIN unseen, clamped to 0..1', () => {
  const lab: Lab = { ...begin('lunch', COUNTER, 0), clock: seen.clock }
  const half = step(lab, seen.pos, 0, undefined, FILL / 2).lab
  assert.ok(Math.abs(half.aware - 0.5) < 1e-9, `${half.aware}`)
  assert.equal(half.caught, undefined, 'half seen is not caught')
  const draining = step({ ...lab, aware: 0.6 }, OUTSIDE, 0, undefined, DRAIN / 2).lab
  assert.ok(Math.abs(draining.aware - 0.1) < 1e-9, `${draining.aware}`)
  assert.equal(step({ ...lab, aware: 0.1 }, OUTSIDE, 0, undefined, 5).lab.aware, 0, 'never below empty')
})

test('a full indicator with someone looking is caught, by him; the busted beat runs CAUGHT_TIME and then the retry', () => {
  const lab: Lab = { ...begin('lunch', COUNTER, 0), clock: seen.clock, aware: 0.99 }
  const caught = step(lab, seen.pos, 0, undefined, FILL).lab
  const by = spotter('lunch', seen.clock + FILL, seen.pos)
  assert.equal(caught.aware, 1)
  assert.equal(caught.caught, 0)
  assert.equal(caught.by, by?.id)
  assert.equal(catcher(caught).id, by?.id, 'the one who caught him says his line')
  const mid = scold(caught, CAUGHT_TIME / 2)
  assert.notEqual(mid, 'busted')
  assert.equal((mid as Lab).caught, CAUGHT_TIME / 2)
  assert.equal(scold(mid as Lab, CAUGHT_TIME / 2), 'busted')
  assert.equal(scold(caught, CAUGHT_TIME + 1), 'busted')
})

test("with nobody named, the busted beat is the way's first watcher's", () => {
  assert.equal(catcher(begin('lunch', COUNTER, 0)).id, WATCH.lunch[0]!.id)
  assert.equal(catcher(begin('key', COUNTER, 0)).id, 'sergeant')
})

test("stepping into the records room sends the way in's note once and makes the checkpoint there", () => {
  for (const way of ['lunch', 'key'] as const) {
    const lab: Lab = { ...begin(way, COUNTER, 0), clock: 10 }
    const s = step(lab, IN_RECORDS, 1, undefined, 0.5)
    assert.equal(s.send, way === 'lunch' ? 'lunch' : 'afterLockup')
    assert.equal(s.lab.phase, 'drawers')
    assert.deepEqual(s.lab.checkpoint, { at: IN_RECORDS, facing: 1, clock: 10.5, phase: 'drawers' })
    assert.equal(step(s.lab, IN_RECORDS, 1, undefined, 0.5).send, undefined, 'the way in goes once')
  }
})

test("with the prints in hand the drawers' note goes only on leaving the records room", () => {
  const inside = arrival(lunchFiles, IN_RECORDS, 0)!
  const picked = pick(lunchFiles, inside, 'pullAll', IN_RECORDS, 0)!
  const done = found(picked)
  assert.equal(done.searched, SEARCH_TIME.pullAll)
  assert.equal(step(done, IN_RECORDS, 0, undefined, 0.1).send, undefined, 'still in the room')
  assert.equal(step(done, vec(RECORDS[0] - 2, RECORDS[2] - 2), 0, undefined, 0.1).send, 'pullAll')
  assert.equal(step(picked, vec(RECORDS[0] - 2, RECORDS[2] - 2), 0, undefined, 0.1).send, undefined, 'not without the prints')
})

test('holding the drawers counts their progress as searched; letting go keeps it', () => {
  const lab = pick(lunchFiles, arrival(lunchFiles, IN_RECORDS, 0)!, 'crossCheck', IN_RECORDS, 0)!
  const held = step(lab, IN_RECORDS, 0, { id: DRAWERS.id, progress: 3 }, 0.1).lab
  assert.equal(held.searched, 3)
  assert.equal(step(held, IN_RECORDS, 0, undefined, 0.1).lab.searched, 3)
  assert.equal(step(lab, IN_RECORDS, 0, { id: 'something else', progress: 3 }, 0.1).lab.searched, 0)
})

test('picking a method sets the checkpoint at the open drawers; once the prints are found, or outside the run, it is not the run\'s', () => {
  const inside: Lab = { ...arrival(nightFiles, IN_RECORDS, 0)!, clock: 42, searched: 5 }
  const picked = pick(nightFiles, inside, 'crossCheck', IN_RECORDS, 2)!
  assert.equal(picked.method, 'crossCheck')
  assert.equal(picked.searched, 0, 'a fresh search')
  assert.deepEqual(picked.checkpoint, { at: IN_RECORDS, facing: 2, clock: 42, phase: 'drawers', method: 'crossCheck' })
  assert.equal(pick(nightFiles, found(picked), 'pullAll', IN_RECORDS, 0), undefined, 'not again once found')
  assert.equal(pick(nightFiles, inside, 'yesSir', IN_RECORDS, 0), undefined, 'a story note')
  assert.equal(pick(lunchFiles, undefined, 'lunch', IN_RECORDS, 0), undefined, 'a way in only where the mission starts')
  assert.equal(pick(photos, undefined, 'afterLockup', COUNTER, 0)?.way, 'key')
})

test('busted, the retry is the checkpoint: its place, clock, phase and method, nothing seen or searched', () => {
  const picked = pick(nightFiles, { ...arrival(nightFiles, IN_RECORDS, 0)!, clock: 30 }, 'crossCheck', IN_RECORDS, 0)!
  const later: Lab = { ...picked, clock: 80, aware: 1, caught: 1, by: 'sergeant', searched: 7 }
  const again = restart(later)
  assert.deepEqual(again, { way: 'key', phase: 'drawers', clock: 30, aware: 0, method: 'crossCheck', searched: 0, checkpoint: picked.checkpoint })
})

test('a walker on a loop repeats his round; one who does not stays where his last beat leaves him', () => {
  const airman = WATCH.lunch.find((w) => w.id === 'airman')!
  assert.ok(airman.loop)
  for (const t of [3, 31, 47.5]) assert.deepEqual(poseAt(airman, t + roundTime(airman)), poseAt(airman, t))
  const clerk = WATCH.lunch.find((w) => w.id === 'clerk')!
  assert.equal(clerk.loop, false)
  assert.deepEqual(poseAt(clerk, -5), poseAt(clerk, 0), 'before the run he is where it starts')
  assert.deepEqual(poseAt(clerk, roundTime(clerk) + 500), poseAt(clerk, roundTime(clerk)))
})

test('the counter offers the ways in only; the way is the key only after lockup', () => {
  assert.deepEqual(counterNotes(menu(photos).options.map((o) => o.note)), ['lunch', 'afterLockup'])
  assert.equal(wayOf(nightFiles), 'key')
  assert.equal(wayOf(lunchFiles), 'lunch')
  assert.equal(wayOf(photos), 'lunch')
})

test('the way to the records room is offered only at the mission start before the run; the drawers only in the run, until found', () => {
  const run = arrival(lunchFiles, IN_RECORDS, 0)!
  assert.equal(labSpot(photos, undefined, LAB_SPOT.id), true)
  assert.equal(labSpot(photos, begin('lunch', COUNTER, 0), LAB_SPOT.id), false, 'not once the run is on')
  assert.equal(labSpot(lunchFiles, undefined, LAB_SPOT.id), false)
  assert.equal(labSpot(lunchFiles, run, DRAWERS.id), true)
  assert.equal(labSpot(lunchFiles, undefined, DRAWERS.id), false, 'not without a run')
  assert.equal(labSpot(lunchFiles, found(run), DRAWERS.id), false, 'not once the prints are in hand')
  assert.equal(labSpot(photos, run, DRAWERS.id), false, 'not outside the records room')
  assert.equal(labSpot(photos, undefined, 'table'), false)
})

test('a link into the records room starts the run at its door; anywhere else it does not', () => {
  assert.equal(arrival(nightFiles, IN_RECORDS, 0)?.way, 'key')
  assert.equal(arrival(nightFiles, IN_RECORDS, 0)?.phase, 'drawers')
  assert.equal(arrival(photos, COUNTER, 0), undefined)
})

test("the base entry is the story place's spawn, and a place off the base is an error, not a guess", () => {
  const e = baseEntry(photos)
  assert.ok(Number.isFinite(e.at.x) && Number.isFinite(e.at.z) && Number.isFinite(e.facing))
  assert.throws(() => baseEntry(initialState), /no base spawn/)
})

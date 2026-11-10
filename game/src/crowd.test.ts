import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import type { Pose } from './ambient.ts'
import { poses, slots } from './ambient.ts'
import type { Owen } from './crowd.ts'
import {
  LOD_FULL, LOD_IMPOSTOR, LOD_SLOW, NOD_TIME, RUN_INDOORS, RUN_OUTDOORS, SIDESTEP, STARE_TIME,
  crowdIn, due, lookOf, nodPitch, noticeOf, react, speakUp, stareTime, staringAt, tierAt,
} from './crowd.ts'
import { spaces } from './levels.ts'
import { start } from './prologue.ts'
import { visit } from './talk.ts'
import { angleTo, distance, vec } from './world.ts'

const at = (scene: string): State => ({ ...initialState, scene: scene as State['scene'] })
const barNight = at('p_bar')
const walkHome = at('p_letter')
const walkToRiver = at('p_dock')

// A person standing at the origin facing +z, and one walking +z.
const stander: Pose = { who: 'miner', slot: 'silverPan.stool1', space: 'bar', at: vec(0, 0), yaw: 0, activity: 'stand', speed: 0 }
const walker: Pose = { ...stander, who: 'touristHusband', slot: 'secondAvenue.walk', space: 'downtown', speed: 1.1 }
const owen = (x: number, z: number, o: Partial<Owen> = {}): Owen => ({ pos: vec(x, z), vel: vec(0, 0), view: Math.PI, interior: true, ...o })

test('crowd density comes from the schedule: the bar packed at night, the street thin in the morning, nobody at the camp', () => {
  const seats = slots.filter((s) => s.space === 'bar').length
  const perSquareMeter = (s: State, space: 'bar' | 'downtown') => crowdIn(s, space, 0).length / (spaces[space].size.w * spaces[space].size.d)
  const bar = crowdIn(barNight, 'bar', 0).length
  assert.ok(bar >= 9, `${bar} in the bar at night`)
  assert.ok(bar / seats > 0.6, "most of the bar's places are taken")
  assert.ok(perSquareMeter(walkToRiver, 'downtown') * 50 < perSquareMeter(barNight, 'bar'), 'the street is far thinner than the bar')
  assert.equal(crowdIn(walkHome, 'bar', 0).length, 0, 'the bar empties out of the walk home')
  assert.deepEqual(crowdIn(at('p_camp'), 'downtown', 0), [])
})

test('every townsperson has a look of their own', () => {
  const looks = prologueTown.map((a) => JSON.stringify(lookOf(a.id)))
  assert.equal(new Set(looks).size, looks.length)
})

test('LOD: whole up close, posed less often further out, an impostor, then not drawn', () => {
  assert.equal(tierAt(0), 'full')
  assert.equal(tierAt(LOD_FULL), 'slow')
  assert.equal(tierAt(LOD_SLOW), 'impostor')
  assert.equal(tierAt(LOD_IMPOSTOR), 'hidden')
  assert.ok(due('full', 1, 1))
  assert.ok(!due('slow', 1, 1.1) && due('slow', 1, 1.25))
  assert.ok(!due('impostor', 1, 1.5) && due('impostor', 1, 2))
  assert.ok(!due('hidden', 0, 1e9))
  // The whole bar is inside full detail from anywhere in it.
  assert.ok(crowdIn(barNight, 'bar', 0).every((p) => tierAt(distance(p.at, vec(0, 3))) === 'full'))
})

test('people look at Owen when he is near and in front of them, not behind them', () => {
  assert.equal(noticeOf(stander, owen(0, 3), 0), 'look')
  assert.equal(noticeOf(stander, owen(0, -3), 0), 'none')
  assert.equal(noticeOf(stander, owen(0, 9), 0), 'none')
  const r = react(stander, owen(2, 2), 0)
  assert.ok(Math.abs(r.head - Math.PI / 4) < 1e-9, 'the head turns toward him')
  assert.equal(r.yaw, stander.yaw, 'the body stays at its activity')
  assert.ok(react(stander, owen(3, 0.2), 0).head <= (70 * Math.PI) / 180 + 1e-9, 'a head turns only so far')
})

test('a nod as he walks past, and the nod dips once and comes back', () => {
  assert.equal(noticeOf(stander, owen(1, 1, { vel: vec(1.2, 0) }), 0), 'nod')
  assert.equal(noticeOf(stander, owen(1, 1), 0), 'look', 'standing still, no nod')
  assert.equal(nodPitch(0), 0)
  assert.ok(nodPitch(NOD_TIME / 2) > 0.2)
  assert.equal(nodPitch(NOD_TIME), 0)
})

test('running indoors turns heads; outdoors it takes a run, not a brisk walk', () => {
  const brisk = vec(RUN_INDOORS + 0.1, 0)
  assert.equal(noticeOf(stander, owen(3, -2, { vel: brisk }), 0), 'run', 'even from behind')
  assert.equal(noticeOf(stander, owen(3, -2, { vel: brisk, interior: false }), 0), 'none')
  assert.equal(noticeOf(stander, owen(3, -2, { vel: vec(RUN_OUTDOORS + 0.1, 0), interior: false }), 0), 'run')
  const r = react(stander, owen(3, -2, { vel: brisk }), 0)
  assert.equal(r.yaw, angleTo(stander.at, vec(3, -2)), 'they turn to face him')
})

test('bumping someone, and staring too long, gets the story reaction', () => {
  assert.equal(noticeOf(stander, owen(0.3, 0.3), 0), 'bump')
  assert.equal(noticeOf(stander, owen(0, -0.5, { vel: vec(5, 0) }), 0), 'bump', 'a bump wins over a run')
  const o = owen(0, 4, { view: Math.PI })
  assert.ok(staringAt(stander, o))
  assert.ok(!staringAt(stander, owen(0, 4, { view: 0 })))
  const stared = [0.5, 1, 1, 0.5].reduce((t, dt) => stareTime(t, dt, staringAt(stander, o)), 0)
  assert.ok(stared >= STARE_TIME)
  assert.equal(noticeOf(stander, o, stared), 'stare')
  assert.equal(stareTime(stared, 0.1, false), 0, 'looking away ends it')
})

test('a walker steps aside from Owen in their way, to the side he is not on', () => {
  assert.equal(noticeOf(walker, owen(0.3, 1.5, { interior: false }), 0), 'way')
  assert.equal(noticeOf(walker, owen(0.3, -1.5, { interior: false }), 0), 'none', 'behind them is not in the way')
  assert.notEqual(noticeOf(stander, owen(0.3, 1.5), 0), 'way', 'someone standing still has no way to be in')
  const r = react(walker, owen(0.3, 1.5, { interior: false }), 0)
  assert.ok(Math.abs(distance(r.aside, vec(0, 0)) - SIDESTEP) < 1e-9)
  assert.ok(r.aside.x < 0, 'away from Owen, who is to their +x')
})

test('a bump, a run and a stare speak the story line once, and only for people who have one', () => {
  const v = visit({ ...start(), story: barNight })
  const bumped = speakUp(v, 'airmanCounter', 'bump')
  assert.deepEqual(bumped.talk.log.map((l) => l.text), ['Watch the napkin.'])
  assert.equal(speakUp(bumped, 'airmanCounter', 'bump').talk.log.length, 1, 'not again while the line is up')
  assert.equal(speakUp(v, 'airmanJukebox', 'stare').talk.log.at(-1)?.text, 'Something on my face, mister?')
  assert.equal(speakUp(v, 'airmanPool', 'run').talk.log.at(-1)?.text, 'Fire somewhere?')
  assert.equal(speakUp(v, 'nightBartender', 'bump'), v, 'nothing to say')
  assert.equal(speakUp(v, 'airmanCounter', 'nod'), v, 'a nod is not a line')
})

test('the same seed replays the same crowd, reactions included', () => {
  const run = () => [0, 3, 7.5].map((t) => crowdIn(walkToRiver, 'downtown', t).map((p) => react(p, owen(10, 30, { interior: false }), 0)))
  assert.deepEqual(run(), run())
  assert.deepEqual(crowdIn(barNight, 'bar', 4), poses(barNight, 1, 4).filter((p) => p.space === 'bar'))
})

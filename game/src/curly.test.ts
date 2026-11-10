import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALARM_GLANCE, ALARM_TIME, BEATS, CURLY_AT, CURLY_PERIOD, LOOK_FROM, LOOK_TO, beatOf, beatStart, calm, clockOf, cueBetween, curlyPose, gaze, listen, noiseRadius, notice, routine } from './curly.ts'
import { angleBetween, angleTo, vec } from './world.ts'
import { WALK_SPEED } from './cast.ts'

const samples = (from: number, to: number, step = 0.05): readonly number[] => Array.from({ length: Math.floor((to - from) / step) }, (_, i) => from + i * step)

test('Curly only looks during the look over the camp: every other beat his eyes are on his work', () => {
  samples(0, CURLY_PERIOD).forEach((t) => assert.equal(routine(t).eyes, t >= LOOK_FROM && t < LOOK_TO, `at ${t.toFixed(2)} (${beatOf(t)})`))
  assert.deepEqual(BEATS.map((b) => b.id), ['refuel', 'toFloat', 'floats', 'toTail', 'tail', 'toCans', 'swat', 'glance', 'look', 'back'])
})

test('his head turns toward the camp before he looks, and his body follows', () => {
  const glance = beatStart('glance')
  assert.equal(routine(glance).head, 0)
  const turned = routine(LOOK_FROM - 0.01)
  assert.ok(turned.head > 1, 'by the end of the glance his head is over his shoulder')
  assert.equal(turned.eyes, false, 'the turn of the head is the warning, not the look')
  assert.equal(turned.heading, routine(glance).heading, 'his body has not moved yet')
  const g0 = gaze(routine(LOOK_FROM))
  const g1 = gaze(routine(LOOK_FROM + 0.4))
  assert.ok(Math.abs(g0 - gaze(turned)) < 0.05, 'the look starts where the head already was')
  assert.ok(g1 > g0, 'and comes on round to the camp')
})

test('his routine walks him between the cans, the float and the tail at a walk, and back to the cans to look', () => {
  samples(0, CURLY_PERIOD, 0.1).forEach((t) => {
    const a = routine(t)
    const b = routine(t + 0.1)
    assert.ok(Math.hypot(b.at.x - a.at.x, b.at.z - a.at.z) <= WALK_SPEED * 0.1 + 1e-6, `no jump at ${t.toFixed(1)}`)
  })
  assert.deepEqual(routine(LOOK_FROM).at, CURLY_AT)
  assert.deepEqual(routine(0).at, CURLY_AT)
  assert.equal(routine(beatStart('toFloat') + 0.2).clip, 'walk')
  assert.equal(routine(beatStart('swat') + 0.2).clip, 'wave')
  assert.equal(routine(LOOK_FROM + 1).clip, 'drink', 'he smokes while he looks')
})

test('running on the gravel is heard across the bar; walking through the willows is not heard at all', () => {
  assert.equal(noiseRadius('willow', WALK_SPEED), 0)
  assert.equal(noiseRadius('tussock', WALK_SPEED), 0)
  assert.ok(noiseRadius('gravel', 3.5) >= 15)
  assert.ok(noiseRadius('gravel', WALK_SPEED) < 3)
  assert.ok(noiseRadius('willow', 3.5) < noiseRadius('gravel', 3.5))
  assert.equal(noiseRadius('gravel', 0), 0, 'standing still makes no sound')
})

test('a noise turns him to it: head first, then he looks there, then his day picks up where it left off', () => {
  const t = 1
  const owen = vec(4, 0)
  const heard = listen(calm, t, { pos: owen, vel: vec(3.5, 0), surface: 'gravel' })
  assert.deepEqual(heard.alarm, { at: owen, since: t })
  const turning = curlyPose(heard, t + ALARM_GLANCE / 2)
  assert.equal(turning.eyes, false)
  assert.ok(Math.abs(turning.head) > 0.1)
  const looking = curlyPose(heard, t + ALARM_GLANCE + 0.6)
  assert.equal(looking.eyes, true)
  assert.ok(angleBetween(gaze(looking), angleTo(looking.at, owen)) < 0.3)
  assert.equal(clockOf(heard, t + 2), t, 'his routine waits while he looks')
  const after = listen(heard, t + ALARM_TIME + 0.01, { pos: owen, vel: vec(0, 0), surface: 'gravel' })
  assert.equal(after.alarm, undefined)
  assert.equal(after.lost, ALARM_TIME)
  assert.ok(Math.abs(clockOf(after, t + ALARM_TIME + 0.01) - (t + 0.01)) < 1e-9)
  assert.equal(listen(calm, t, { pos: owen, vel: vec(WALK_SPEED, 0), surface: 'willow' }).alarm, undefined)
  assert.equal(listen(calm, t, { pos: vec(30, 0), vel: vec(3.5, 0), surface: 'gravel' }).alarm, undefined, 'too far to hear')
})

test('the indicator fills while he sees Owen and empties when he does not', () => {
  const half = notice(calm, true, 0.25)
  assert.ok(half.aware > 0.4 && half.aware < 0.6)
  assert.equal(notice(half, true, 1).aware, 1)
  assert.equal(notice(notice(half, true, 1), false, 5).aware, 0)
})

test('his lighter clicks once a period, as the glance begins', () => {
  const at = beatStart('glance')
  assert.ok(cueBetween(at - 0.01, at + 0.01))
  assert.ok(!cueBetween(at + 0.01, at + 0.5))
  assert.ok(cueBetween(at + CURLY_PERIOD - 0.01, at + CURLY_PERIOD))
  assert.equal(samples(0, 3 * CURLY_PERIOD, 1 / 30).filter((t) => cueBetween(t, t + 1 / 30)).length, 3)
})

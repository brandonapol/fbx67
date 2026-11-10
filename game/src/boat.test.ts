import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ELI_AHEAD, RIVERBOAT_L, course, riverboatHull } from './boat.ts'
import { BOW, RIDE_LENGTH, RIDE_PATH, RIDE_SPEED, RIDE_TIME, rideAt } from './skiff.ts'
import { angleTo, distance, vec } from './world.ts'

const close = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) < eps

const bend = course([vec(0, 0), vec(0, -10), vec(6, -18)], 2, 2)

test('a course starts with the seat on the first point and the bow ahead of it on the line', () => {
  const r = bend.at(0)
  assert.deepEqual(r.seat, vec(0, 0))
  assert.ok(close(distance(r.seat, r.bow), 2))
  assert.ok(close(r.heading, angleTo(r.seat, r.bow)))
  assert.deepEqual(bend.at(-5), r, 'before the ride, at its start')
})

test('the ride is over when the bow reaches the end of the line, and stays there', () => {
  assert.ok(close(bend.length, 10 + 10 - 2))
  assert.ok(close(bend.time, bend.length / 2))
  assert.deepEqual(bend.at(bend.time).bow, vec(6, -18))
  assert.deepEqual(bend.at(bend.time + 30), bend.at(bend.time))
})

test('the seat moves at the course speed and never jumps, round the bend too', () => {
  const dt = 1 / 30
  Array.from({ length: Math.ceil(bend.time / dt) }, (_, i) => i * dt).forEach((t) => {
    const step = distance(bend.at(t).seat, bend.at(t + dt).seat)
    assert.ok(step <= 2 * dt + 1e-9, `${step} at ${t}`)
  })
})

test('the skiff rides the same course it always did', () => {
  const total = RIDE_PATH.slice(1).reduce((n, p, i) => n + distance(RIDE_PATH[i]!, p), 0)
  assert.ok(close(RIDE_LENGTH, total - BOW))
  assert.ok(close(RIDE_TIME, RIDE_LENGTH / RIDE_SPEED))
  assert.deepEqual(rideAt(0).seat, RIDE_PATH[0])
  assert.deepEqual(rideAt(RIDE_TIME).bow, RIDE_PATH.at(-1))
})

test("Eli's riverboat holds Wade's thwart and Eli's stand inside its hull", () => {
  const floor = riverboatHull[0]!
  assert.equal(floor.box.d, RIVERBOAT_L)
  ;[-ELI_AHEAD / 2, ELI_AHEAD / 2].forEach((z) => assert.ok(Math.abs(z) < RIVERBOAT_L / 2 - 0.5, `${z} is aboard`))
})

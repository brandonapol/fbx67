import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FLIGHT_TIME, LEG_FADE, MOORED, MOORED_HEADING, OWEN_SEAT, PARKED, PILOT_SEAT, TOWN_TIME, flightFade, flightLight, legAt, litGold, onBoard, planeAt, seatAt } from './flight.ts'
import { lighting, summerExposure } from './lighting.ts'
import { posed, poses } from './probe.ts'
import { start } from './prologue.ts'
import { FLOAT } from './downtown.ts'
import { angleBetween, distance, vec } from './world.ts'

test('the plane starts moored at the float, nose to the river, and ends parked on the gravel bar at the camp', () => {
  const start = planeAt(0)
  assert.deepEqual(start.at, MOORED)
  assert.equal(start.y, 0)
  assert.ok(angleBetween(start.heading, MOORED_HEADING) < 1e-9)
  assert.ok(MOORED.x > FLOAT[1], 'alongside the float, not on it')
  const end = planeAt(FLIGHT_TIME)
  assert.ok(distance(end.at, PARKED) < 1e-9)
  assert.equal(end.y, 0)
  assert.ok(angleBetween(end.heading, Math.PI) < 0.5, 'nose up the bar toward the camp')
})

test('the flight takes off on the river over town, then comes down at the camp', () => {
  assert.equal(legAt(0), 'downtown')
  assert.equal(legAt(TOWN_TIME - 0.01), 'downtown')
  assert.equal(legAt(TOWN_TIME), 'camp')
  assert.equal(planeAt(10).y, 0, 'still on the water on the takeoff run')
  assert.ok(planeAt(10).at.z < -10, 'the takeoff run is on the river, north of the bank')
  assert.ok(planeAt(TOWN_TIME * 0.7).y > 50, 'over town at height')
  assert.ok(planeAt(TOWN_TIME + 1).y > planeAt(FLIGHT_TIME - 6).y, 'descending to the bar')
})

test('where the plane is is a pure function of the time: the same second is the same frame', () => {
  const ts = [0, 1.5, 7.25, TOWN_TIME - 0.5, TOWN_TIME + 2, FLIGHT_TIME]
  ts.forEach((t) => assert.deepEqual(planeAt(t), planeAt(t), `${t}`))
  // Its path is smooth: no jump between frames a thirtieth of a second apart.
  Array.from({ length: Math.floor(TOWN_TIME * 30) - 1 }, (_, i) => i / 30).forEach((t) => {
    const [a, b] = [planeAt(t), planeAt(t + 1 / 30)]
    assert.ok(distance(a.at, b.at) < 2, `jump at ${t.toFixed(2)}`)
    assert.ok(angleBetween(a.heading, b.heading) < 0.2, `snap turn at ${t.toFixed(2)}`)
  })
})

test('the screen dips to black between the town leg and the camp leg, and is clear the rest of the flight', () => {
  assert.equal(flightFade(undefined), 0, 'not flying')
  assert.equal(flightFade(0), 0, 'at the float')
  assert.equal(flightFade(TOWN_TIME), 1, 'black at the cut to the camp')
  assert.equal(flightFade(TOWN_TIME - LEG_FADE), 0)
  assert.equal(flightFade(TOWN_TIME + LEG_FADE), 0)
  assert.ok(flightFade(TOWN_TIME - LEG_FADE / 2) > 0.4 && flightFade(TOWN_TIME - LEG_FADE / 2) < 0.6, 'a ramp, not a cut')
  assert.equal(flightFade(FLIGHT_TIME - 1), 0, 'clear for the landing')
})

test('over town the flight is lit low and gold; at the camp, and on the ground, the story clock lights it', () => {
  const base = lighting('downtown', 'summer', 'clear', '1967-07-15T10:00')
  const gold = flightLight(base, 20)
  assert.ok(gold.sunElevation <= 12, `low sun, got ${gold.sunElevation}`)
  assert.ok(base.sunElevation > 30, 'the 10:00 sun it replaces is high')
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(gold.sun.slice(i, i + 2), 16))
  assert.ok(r! > g! && g! > b!, `a gold key, got ${gold.sun}`)
  assert.equal(flightLight(base, TOWN_TIME + 1), base, 'the camp leg is the camp scene at its own clock')
  assert.equal(flightLight(base, undefined), base, 'not flying')
  assert.equal(litGold(10), true)
  assert.equal(litGold(TOWN_TIME), false)
  assert.equal(litGold(undefined), false)
})

test('Curly flies from the left seat and Owen rides in the right, at any heading', () => {
  ;[0, 7, 20, 33, TOWN_TIME + 4].forEach((t) => {
    const p = planeAt(t)
    // Starboard, the right hand of someone facing the nose (x east, z south, y up): (-cos h, sin h).
    const right = (v: { x: number; z: number }): number => (v.x - p.at.x) * -Math.cos(p.heading) + (v.z - p.at.z) * Math.sin(p.heading)
    assert.ok(right(seatAt(t, PILOT_SEAT).at) < 0, `pilot on the left at ${t}`)
    assert.ok(right(seatAt(t, OWEN_SEAT).at) > 0, `Owen on the right at ${t}`)
    assert.ok(right(onBoard(p, vec(1, 0))) < 0, 'local +x is port')
  })
})

test('the flight capture pose holds the plane mid-turn over town, in the gold light, clear of the fade', () => {
  const p = poses.flight!
  assert.equal(p.space, 'downtown')
  const g = posed({ ...start(), space: 'downtown', flight: 0.5 }, p)
  assert.equal(g.flight, p.flight)
  assert.equal(legAt(g.flight!), 'downtown')
  assert.ok(litGold(g.flight))
  assert.equal(flightFade(g.flight), 0)
  assert.ok(planeAt(g.flight).y > 10, 'in the air')
})

test('the gold light over town is exposed for its own low sun, not the camp clock\'s high one', () => {
  const tenAm = lighting('downtown', 'summer', 'clear', '1967-07-15T10:00')
  assert.ok((tenAm.exposure ?? 1) < 0.6, 'the story clock alone would expose the town leg down')
  const gold = flightLight(tenAm, 5)
  assert.equal(gold.sunElevation, 8)
  assert.equal(gold.exposure, summerExposure(gold.sunElevation))
  assert.equal(gold.exposure, 1)
})

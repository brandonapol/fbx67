import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FLIGHT_TIME, MOORED, MOORED_HEADING, PARKED, TOWN_TIME, legAt, planeAt } from './flight.ts'
import { FLOAT } from './downtown.ts'
import { angleBetween, distance } from './world.ts'

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

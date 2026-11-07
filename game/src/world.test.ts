import { test } from 'node:test'
import assert from 'node:assert/strict'
import { angleBetween, blocked, lineOfSight, move, nearest, sees, vec } from './world.ts'

const wall = { x: 0, z: 0, w: 2, d: 2 }

test('move stops at a wall and slides along it', () => {
  const p = move(vec(-3, 0.5), vec(1, 0), 5, [wall])
  assert.ok(p.x <= -1.35 && p.x > -1.55)
  const slid = move(vec(-1.4, 0.5), vec(1, 1), 1, [wall])
  assert.ok(slid.z > 1.2)
  assert.ok(!blocked(slid, [wall]))
})

test('nearest picks the closest interactable in reach', () => {
  const items = [
    { id: 'a', x: 1, z: 0, r: 2, prompt: '' },
    { id: 'b', x: 0.5, z: 0, r: 2, prompt: '' },
    { id: 'c', x: 0.1, z: 0, r: 0.05, prompt: '' },
  ]
  assert.equal(nearest(vec(0, 0), items)?.id, 'b')
  assert.equal(nearest(vec(9, 9), items), undefined)
})

test('line of sight is cut by a box', () => {
  assert.equal(lineOfSight(vec(-3, 0), vec(3, 0), [wall]), false)
  assert.equal(lineOfSight(vec(-3, 3), vec(3, 3), [wall]), true)
})

test('a watcher sees inside its cone and range only', () => {
  const w = { at: vec(0, 0), facing: 0, range: 5, halfAngle: 0.5 }
  assert.ok(sees(w, vec(0, 4), []))
  assert.ok(!sees(w, vec(0, 6), []))
  assert.ok(!sees(w, vec(4, 0.5), []))
  assert.ok(!sees(w, vec(0, -4), []))
})

test('angles wrap', () => {
  assert.ok(Math.abs(angleBetween(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-9)
})

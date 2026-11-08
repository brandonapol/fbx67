import { test } from 'node:test'
import assert from 'node:assert/strict'
import { angleBetween, blocked, lineOfSight, move, pick, sees, vec } from './world.ts'

const wall = { x: 0, z: 0, w: 2, d: 2 }

test('move stops at a wall and slides along it', () => {
  const p = move(vec(-3, 0.5), vec(1, 0), 5, [wall])
  assert.ok(p.x <= -1.35 && p.x > -1.55)
  const slid = move(vec(-1.4, 0.5), vec(1, 1), 1, [wall])
  assert.ok(slid.z > 1.2)
  assert.ok(!blocked(slid, [wall]))
})

test('pick takes the closest interactable in reach when both are in view', () => {
  const items = [
    { id: 'a', x: 1, z: 0, r: 2 },
    { id: 'b', x: 0.5, z: 0, r: 2 },
    { id: 'c', x: 0.1, z: 0, r: 0.05 },
  ]
  assert.equal(pick(vec(0, 0), Math.PI / 2, Math.PI / 2, items)?.id, 'b')
  assert.equal(pick(vec(9, 9), Math.PI / 2, Math.PI / 2, items), undefined)
})

test('pick prefers what is in view over something a little nearer to the side', () => {
  const items = [
    { id: 'ahead', x: 0, z: 1.2, r: 2 },
    { id: 'side', x: 1, z: 0, r: 2 },
  ]
  assert.equal(pick(vec(0, 0), 0, 0, items)?.id, 'ahead')
  assert.equal(pick(vec(0, 0), Math.PI / 2, Math.PI / 2, items)?.id, 'side')
})

test('pick follows the camera when it looks at one thing and Owen faces another', () => {
  const items = [
    { id: 'looked-at', x: 1.2, z: 0, r: 2 },
    { id: 'faced', x: 0, z: 1.2, r: 2 },
  ]
  assert.equal(pick(vec(0, 0), Math.PI / 2, 0, items)?.id, 'looked-at')
  assert.equal(pick(vec(0, 0), 0, Math.PI / 2, items)?.id, 'faced')
})

test('pick ignores what is outside the view cone, unless Owen stands on it', () => {
  const wide = [{ id: 'wide', x: 0.9, z: 0.3, r: 2 }]
  assert.equal(pick(vec(0, 0), 0, 0, wide), undefined)
  assert.equal(pick(vec(0, 0), 0.9, 0, wide)?.id, 'wide')
  const behind = [{ id: 'behind', x: 0, z: -0.8, r: 2 }]
  assert.equal(pick(vec(0, 0), 0, 0, behind), undefined)
  assert.equal(pick(vec(0, -0.7), 0, 0, behind)?.id, 'behind')
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

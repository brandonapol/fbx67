import { test } from 'node:test'
import assert from 'node:assert/strict'
import { depthAt } from './highwater.ts'
import { KNEE, WAIST } from './trail.ts'
import { DOWNSTREAM, DRIFT, SECOND_NORTH, drift, lean, moving, takesFeet } from './current.ts'
import { length, vec } from './world.ts'

// The spec's numbers (docs/acts/act1-missions.md, section 1; docs/town-map.md, the depth table): north of Second the
// water runs past a meter and moving (row A, First Avenue, the bank); past his waist there, the current takes his feet.

test('the moving water is north of Second Avenue: row A, First Avenue and the bank', () => {
  assert.equal(SECOND_NORTH, 48, "Second Avenue's north curb on the town map")
  ;[1, 9, 32, 47.9].forEach((z) => assert.ok(moving(vec(3, z)), `z ${z} moves`))
  ;[48, 56, 64, 103].forEach((z) => assert.ok(!moving(vec(3, z)), `z ${z} stands`))
  // Row A runs past a meter, First Avenue and the bank deeper still.
  assert.ok(depthAt(32) > 1 && depthAt(9) > depthAt(32) && depthAt(1) > depthAt(9))
})

test('the current runs west, with the Chena', () => {
  assert.deepEqual(DOWNSTREAM, vec(-1, 0))
  const d = drift(vec(3, 40), depthAt(40), 0)
  assert.ok(d.x < 0 && d.z === 0)
})

test('the push is nothing at Second and rises with depth to its full strength at the waist', () => {
  assert.equal(lean(vec(3, SECOND_NORTH - 1e-9), depthAt(SECOND_NORTH), 0), 0, 'nothing at the curb')
  const zs = [47, 44, 41, 38]
  const pushes = zs.map((z) => length(drift(vec(3, z), depthAt(z), 0)))
  pushes.forEach((p, i) => {
    assert.ok(p > 0 && p < DRIFT, `some push at z ${zs[i]}`)
    if (i > 0) assert.ok(p > pushes[i - 1]!, 'deeper pushes harder')
  })
  assert.equal(length(drift(vec(3, 30), WAIST, 0)), DRIFT, 'full at the waist')
  assert.equal(length(drift(vec(3, 30), 1.4, 0)), DRIFT, 'and no more past it')
})

test('standing water does not push, at any depth, and a deck is out of the water', () => {
  ;[0.3, KNEE, 0.72, WAIST, 1.3].forEach((d) => assert.equal(length(drift(vec(30, 56), d, 0)), 0, `${d} m on Second`))
  assert.equal(length(drift(vec(3, 40), depthAt(40), 0.4)), 0, 'on a deck')
})

test('past his waist in the moving water the current takes his feet, and nowhere else', () => {
  assert.ok(takesFeet(vec(3, 32), depthAt(32), 0), 'row A, past a meter')
  assert.ok(takesFeet(vec(3, 9), depthAt(9), 0), 'First Avenue')
  assert.ok(!takesFeet(vec(3, 40), depthAt(40), 0), 'short of the waist at z 40')
  assert.ok(depthAt(40) < WAIST && depthAt(40) > KNEE)
  assert.ok(!takesFeet(vec(3, 32), WAIST, 0), 'at the waist itself he keeps his feet')
  assert.ok(!takesFeet(vec(30, 56), 1.3, 0), 'chest-deep in standing water on Second')
  assert.ok(!takesFeet(vec(3, 32), depthAt(32), 0.5), 'on a deck')
})

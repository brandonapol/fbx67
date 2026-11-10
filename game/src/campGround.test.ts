import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CREEK_FAR, CREEK_NEAR, GRID, MARKER_RISE, WATER_Y, groundY, heightmap, plants, speckAt, splatAt, surfaceAt } from './campGround.ts'
import { CACHE_BOX, FIRE_RING, TENT, camp } from './camp.ts'
import { vec } from './world.ts'
import { hits } from './world.ts'

test('the camp stands on flat gravel, the marker on its rise, the creek below the water line and the cutbank above', () => {
  ;[camp.spawn, vec(TENT.x, TENT.z), vec(CACHE_BOX.x, CACHE_BOX.z), FIRE_RING, vec(-6.4, 5.4)].forEach((p) =>
    assert.ok(Math.abs(groundY(p.x, p.z)) < 0.12, `flat at ${p.x},${p.z}: ${groundY(p.x, p.z)}`),
  )
  assert.ok(groundY(MARKER_RISE.x, MARKER_RISE.z) > 0.5, 'the marker is up on a rise')
  assert.ok(groundY(0, (CREEK_NEAR + CREEK_FAR) / 2) < WATER_Y - 0.2, 'the channel is under water')
  assert.ok(groundY(0, CREEK_FAR + 3) > 2.5, 'the cutbank stands across the creek')
})

test('the heightmap is the walk: every sample is groundY at that point, and none is NaN', () => {
  const h = heightmap()
  assert.equal(h.length, GRID * GRID)
  assert.ok(h.every(Number.isFinite))
})

test('the ground underfoot: gravel on the bar, willow in the thickets, tussock to the north and on the rise', () => {
  assert.equal(surfaceAt(camp.spawn), 'gravel')
  assert.equal(surfaceAt(vec(-2.6, 1.8)), 'willow')
  assert.equal(surfaceAt(vec(0, -8)), 'tussock')
  assert.equal(surfaceAt(vec(MARKER_RISE.x, MARKER_RISE.z + 1.2)), 'tussock')
})

test('the splat weights sum to one everywhere, and the cutbank face is bare silt', () => {
  for (let x = -60; x <= 70; x += 13) for (let z = -50; z <= 40; z += 11) {
    const s = splatAt(x, z)
    assert.ok(Math.abs(s.gravel + s.sand + s.moss + s.silt - 1) < 1e-9)
  }
  assert.ok(splatAt(0, CREEK_FAR + 0.7).silt > 0.5)
  assert.ok(splatAt(0, 0).gravel > 0.5)
})

test('nothing grows in the way: no plant stands in a hiding spot, on the walk to one, or in the tent, cache or creek', () => {
  const spots = camp.spots
  const kinds = ['fireweed', 'tussock', 'alder'] as const
  kinds.forEach((k) =>
    plants[k].forEach((p) => {
      spots.forEach((s) => assert.ok(Math.hypot(p.x - s.x, p.z - s.z) > s.r * 0.6, `${k} at ${p.x.toFixed(1)},${p.z.toFixed(1)} is in ${s.id}`))
      assert.ok(!hits(vec(p.x, p.z), { x: TENT.x, z: TENT.z, w: TENT.w, d: TENT.d }, 0), `${k} in the tent`)
    }),
  )
  plants.spruce.forEach((p) => assert.ok(p.z < CREEK_NEAR || p.z > CREEK_FAR, 'no spruce in the creek'))
})

test('the mosquitoes hang over the willow, a meter or so up', () => {
  const [x, y, z] = speckAt(0, 3, 12.5)
  assert.ok(Math.hypot(x + 2.6, z - 1.8) < 1.2)
  assert.ok(y > 0.5 && y < 2)
})

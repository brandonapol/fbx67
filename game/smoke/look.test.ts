import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TARGETS, lookOf, misses } from './look.ts'

const frame = (pixels: readonly (readonly [number, number, number])[]) => ({
  width: pixels.length,
  height: 1,
  data: Buffer.from(pixels.flatMap(([r, g, b]) => [r, g, b, 255])),
})

test('the look of a frame: luma percentiles on Rec.709 and the hue of the mean color', () => {
  const ramp = frame(Array.from({ length: 100 }, (_, i) => [i * 2, i * 2, i * 2] as const))
  const l = lookOf(ramp)
  assert.deepEqual([l.p1, l.p50, l.p99], [0, 98, 196])
  assert.equal(lookOf(frame([[200, 100, 0]])).hue, 30)
})

test('a frame passes its target within ten of each luma percentile and eight degrees of hue', () => {
  const t = TARGETS.surveyCamp
  assert.deepEqual(misses({ ...t, p1: t.p1 + 10, hue: t.hue - 8 }, t), [])
  assert.deepEqual(misses({ ...t, p50: t.p50 + 11 }, t), [`p50 luma ${t.p50 + 11}, target ${t.p50} ± 10`])
  assert.equal(misses({ ...t, hue: (t.hue + 352) % 360 }, t).length, 0, 'hue wraps around')
  assert.equal(misses({ ...t, hue: t.hue + 20 }, t).length, 1)
})

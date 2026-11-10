import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Ground } from './footsteps.ts'
import { SEASON_F, SOFT_SNOW_F, SQUEAK_SNOW_F, glideAt, pace, snowAt, standing, stepTempF, strideFor, surfaceAt } from './footsteps.ts'
import { vec } from './world.ts'

test('a stride is never shorter than standing still, and grows with speed', () => {
  assert.equal(strideFor(0), 0.42)
  assert.equal(strideFor(-3), 0.42, 'negative speed is no speed')
  assert.ok(Math.abs(strideFor(1) - 0.64) < 1e-12)
  assert.ok(strideFor(4) > strideFor(2))
})

test('not moving, or no time passing, resets the phase and falls no foot', () => {
  const mid = { phase: 0.3, steps: 5 }
  ;[
    [0, 0.1],
    [-1, 0.1],
    [Number.NaN, 0.1],
    [0.5, 0],
    [0.5, -0.1],
    [0.5, Number.NaN],
  ].forEach(([w, dt]) => {
    const s = pace(mid, w!, dt!)
    assert.equal(s.falls, 0, `${w} in ${dt}`)
    assert.equal(s.gait.phase, standing.phase)
    assert.equal(s.gait.steps, 5, 'the count is kept')
  })
})

test('a long jump in one tick falls several feet and keeps the phase inside one stride', () => {
  const s = pace(standing, 5, 1)
  const stride = strideFor(5)
  const want = standing.phase + 5 / stride
  assert.equal(s.falls, Math.floor(want))
  assert.equal(s.gait.steps, s.falls)
  assert.ok(s.gait.phase >= 0 && s.gait.phase < 1)
  assert.ok(Math.abs(s.gait.phase - (want - Math.floor(want))) < 1e-9)
})

test('the first foot falls before a full stride from standing', () => {
  const stride = strideFor(1.4)
  const dt = 1 / 60
  const walk = (g: typeof standing, d: number): number => {
    const s = pace(g, 1.4 * dt, dt)
    return s.falls > 0 ? d + 1.4 * dt : walk(s.gait, d + 1.4 * dt)
  }
  const first = walk(standing, 0)
  assert.ok(first < stride, `${first} < ${stride}`)
  assert.ok(Math.abs(first - (1 - standing.phase) * stride) < 1.4 * dt + 1e-9)
})

test('surfaceAt: base surface outside regions, inclusive edges, last region wins', () => {
  const ground: Ground = {
    surface: 'gravel',
    regions: [
      { box: { x: 0, z: 0, w: 4, d: 4 }, surface: 'mud' },
      { box: { x: 1, z: 0, w: 2, d: 2 }, surface: 'wood' },
    ],
  }
  assert.equal(surfaceAt(ground, vec(10, 10)), 'gravel')
  assert.equal(surfaceAt(ground, vec(-1.5, 0)), 'mud')
  assert.equal(surfaceAt(ground, vec(-2, 2)), 'mud', 'the corner is inside')
  assert.equal(surfaceAt(ground, vec(1, 0)), 'wood', 'the later region is on top')
  assert.equal(surfaceAt(ground, vec(2, 1)), 'wood', 'its edge too')
  assert.equal(surfaceAt(ground, vec(1.9, 1.5)), 'mud', 'past the wood, still in the mud')
  assert.equal(surfaceAt({ surface: 'snow', regions: [] }, vec(0, 0)), 'snow')
})

test('snow is soft at and above 25 F and fully squeaky at and below -10 F, linear between', () => {
  assert.equal(snowAt(SOFT_SNOW_F).squeak, 0)
  assert.equal(snowAt(60).squeak, 0)
  assert.equal(snowAt(SQUEAK_SNOW_F).squeak, 1)
  assert.equal(snowAt(-60).squeak, 1)
  const mid = (SOFT_SNOW_F + SQUEAK_SNOW_F) / 2
  assert.ok(Math.abs(snowAt(mid).squeak - 0.5) < 1e-12)
  assert.deepEqual(snowAt(SOFT_SNOW_F), { squeak: 0, freq: 700, decay: 0.16, grains: 3 })
  assert.deepEqual(snowAt(SQUEAK_SNOW_F), { squeak: 1, freq: 2200, decay: 0.08, grains: 7 })
})

test('an unknown temperature is soft snow', () => {
  ;[undefined, Number.NaN, Number.POSITIVE_INFINITY].forEach((t) => assert.deepEqual(snowAt(t), snowAt(SOFT_SNOW_F), String(t)))
})

test('the seasons run warm to cold: summer, flood, breakup, freeze-up, deep winter', () => {
  assert.ok(SEASON_F.summer > SEASON_F.flood)
  assert.ok(SEASON_F.flood > SEASON_F.breakup)
  assert.ok(SEASON_F.breakup > SEASON_F.freezeup)
  assert.ok(SEASON_F.freezeup > SEASON_F.winter)
  assert.equal(snowAt(SEASON_F.winter).squeak, 1)
  assert.equal(snowAt(SEASON_F.summer).squeak, 0)
})

test('the story season sets the step temperature; with none the ground keeps its own', () => {
  const ground: Ground = { surface: 'snow', regions: [], tempF: 3 }
  assert.equal(stepTempF(ground, undefined), 3)
  assert.equal(stepTempF(ground, 'winter'), SEASON_F.winter)
  assert.equal(stepTempF({ surface: 'wood', regions: [] }, undefined), undefined)
})

test('the ski glide spans its soft and cold ends exactly', () => {
  assert.deepEqual(glideAt(SOFT_SNOW_F), { freq: 1200, length: 0.55, q: 0.8 })
  const cold = glideAt(SQUEAK_SNOW_F)
  assert.equal(cold.freq, 3600)
  assert.ok(Math.abs(cold.length - 0.35) < 1e-12)
  assert.ok(Math.abs(cold.q - 2.4) < 1e-12)
  assert.deepEqual(glideAt(undefined), glideAt(SOFT_SNOW_F))
})

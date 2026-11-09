import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SEASON_F, glideAt, snowAt, stepTempF, surfaceAt } from './footsteps.ts'
import type { Soundscape, Spot } from './soundscape.ts'
import { FIRE_AT, FREEZEUP_F, SEARCHERS_AT, act2Soundscapes, act3Soundscapes, soundscapes } from './soundscape.ts'
import { CALLS, callGain, footstep, layerVoice, makeBuffers, mulberry, spot } from './synth.ts'
import { vec } from './world.ts'
import { fakeContext } from './fake-audio.ts'

const busOf = (s: Soundscape, which: Spot) => s.events.find((e) => e.spot === which)?.bus

test('every Act 3 space has an ambience bed', () => {
  Object.entries(act3Soundscapes).forEach(([id, scape]) =>
    assert.ok(scape.layers.some((l) => l.bus === 'ambience'), `${id} has no ambience bed`),
  )
})

test('the snow squeaks at forty below in deep winter, and the season sets the temperature', () => {
  assert.equal(SEASON_F.winter, -40)
  assert.equal(SEASON_F.freezeup, FREEZEUP_F)
  assert.equal(snowAt(SEASON_F.winter).squeak, 1)
  assert.equal(snowAt(SEASON_F.summer).squeak, 0)
  const town = act2Soundscapes.town.ground
  assert.equal(stepTempF(town, undefined), FREEZEUP_F, 'no story season keeps the bed temperature')
  assert.equal(stepTempF(town, 'winter'), -40, 'the story season wins')
  assert.equal(stepTempF(town, 'breakup'), SEASON_F.breakup)
  ;(['icefog', 'crash', 'slope'] as const).forEach((id) => assert.equal(act3Soundscapes[id].ground.tempF, SEASON_F.winter, id))
  assert.equal(surfaceAt(act3Soundscapes.icefog.ground, vec(0, 0)), 'snow')
  assert.equal(surfaceAt(act3Soundscapes.crash.ground, vec(0, 0)), 'snow')
})

test('the ice fog is a hush: no wind, no crowd, no music', () => {
  const { icefog } = act3Soundscapes
  assert.ok(icefog.layers.every((l) => l.bus === 'ambience'))
  assert.ok(!icefog.layers.some((l) => l.kind === 'noise' && l.wobble), 'nothing gusts in ice fog')
})

test('the flight coughs on effects; the night keeps a fire; the search calls on voices, far off', () => {
  const { cockpit, crash, slope } = act3Soundscapes
  assert.ok(cockpit.layers.some((l) => l.kind === 'idle'), 'no engine')
  assert.equal(busOf(cockpit, 'cough'), 'sfx')
  assert.ok(crash.layers.some((l) => 'at' in l && l.at === FIRE_AT), 'no fire')
  assert.deepEqual(crash.events.find((e) => e.spot === 'crackle')?.at, FIRE_AT)
  assert.equal(busOf(slope, 'calls'), 'voice')
  assert.deepEqual(slope.events.find((e) => e.spot === 'calls')?.at, SEARCHERS_AT)
  assert.equal(surfaceAt(slope.ground, vec(0, 0)), 'ski')
})

test("the search team's voices fade out: every call quieter than the last", () => {
  const gains = Array.from({ length: CALLS }, (_, i) => callGain(i))
  assert.equal(gains[0], 1)
  gains.slice(1).forEach((g, i) => assert.ok(g < gains[i] && g > 0))
})

test('the ski glide is brighter and shorter in the cold, and finite for any temperature', () => {
  const temps = [32, 10, -10, -40]
  temps.slice(1).forEach((t, i) => {
    const [warm, cold] = [glideAt(temps[i]), glideAt(t)]
    assert.ok(cold.freq >= warm.freq && cold.length <= warm.length)
  })
  ;[undefined, Number.NaN].forEach((t) => assert.deepEqual(glideAt(t), glideAt(25)))
})

const nodesFor = (scape: Soundscape): number => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const before = times.nodes
  scape.layers.forEach((l) => layerVoice(ctx, buffers, l, mulberry(1)))
  return times.nodes - before
}

test('no Act 3 bed builds more nodes than the prologue bar', () => {
  const ceiling = nodesFor(soundscapes.bar)
  Object.entries(act3Soundscapes).forEach(([id, scape]) => assert.ok(nodesFor(scape) <= ceiling, `${id}: ${nodesFor(scape)} > ${ceiling}`))
})

test('every Act 3 layer, spot and the ski step build and schedule finite times', () => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const rand = mulberry(13)
  const dest = ctx.createGain()
  Object.values(act3Soundscapes).forEach((scape) => {
    scape.layers.forEach((l) => {
      const v = layerVoice(ctx, buffers, l, rand)
      v.tick?.(1)
      v.stop(4)
    })
    scape.events.forEach((e) => assert.ok(Number.isFinite(spot(ctx, buffers, e.spot, dest, rand))))
  })
  ;(['cough', 'impact', 'snap', 'calls', 'fall'] satisfies Spot[]).forEach((s) => assert.ok(spot(ctx, buffers, s, dest, rand) > 1, s))
  ;[SEASON_F.winter, 20, undefined].forEach((t) => assert.ok(footstep(ctx, buffers, 'ski', dest, rand, t) > 1))
  assert.ok(times.t.length > 0)
  assert.ok(times.t.every(Number.isFinite))
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Volumes } from './mixer.ts'
import { COVER_FLOOR, DUCK, busGain, busGains, coverGain } from './mixer.ts'
import { SOFT_SNOW_F, SQUEAK_SNOW_F, snowAt, surfaceAt } from './footsteps.ts'
import type { Spot } from './soundscape.ts'
import { FREEZEUP_F, act2Soundscapes } from './soundscape.ts'
import { footstep, layerVoice, makeBuffers, mulberry, spot, strumAt } from './synth.ts'
import { createAudio } from './audio.ts'
import { vec } from './world.ts'
import { fakeContext } from './fake-audio.ts'

const full: Volumes = { ambience: 1, sfx: 1, voice: 1, music: 1 }

const near = (a: number, b: number): void => assert.ok(Math.abs(a - b) < 1e-12, `${a} is not ${b}`)

test('the guitar cover ducks the conversation and nothing else', () => {
  assert.equal(coverGain(0), 1)
  assert.equal(coverGain(1), COVER_FLOOR)
  near(coverGain(0.5), (1 + COVER_FLOOR) / 2)
  const covered = busGains(full, false, 1)
  assert.equal(covered.voice, COVER_FLOOR)
  assert.equal(covered.music, 1)
  assert.equal(covered.ambience, 1)
  assert.equal(covered.sfx, 1)
  assert.deepEqual(busGains(full, false), full)
})

test('the cover clamps to 0..1 and falls monotonically as Wade plays harder', () => {
  assert.equal(coverGain(-3), 1)
  assert.equal(coverGain(4), COVER_FLOOR)
  assert.equal(coverGain(Number.NaN), 1)
  const steps = Array.from({ length: 11 }, (_, i) => coverGain(i / 10))
  steps.slice(1).forEach((g, i) => assert.ok(g < steps[i]))
})

test('the cover stacks with the story panel duck and the voice slider', () => {
  near(busGain(full, 'voice', true, 1), DUCK * COVER_FLOOR)
  near(busGain({ ...full, voice: 0.5 }, 'voice', false, 1), 0.25 * COVER_FLOOR)
  assert.equal(busGain(full, 'music', true, 1), DUCK)
})

test('the hotel mission sets the cover on the engine, clamped, even before audio unlocks', () => {
  const audio = createAudio(undefined)
  assert.equal(audio.cover(), 0)
  audio.setCover(0.6)
  assert.equal(audio.cover(), 0.6)
  audio.setCover(2)
  assert.equal(audio.cover(), 1)
  audio.setCover(-1)
  assert.equal(audio.cover(), 0)
  audio.unlock()
  audio.setCover(0.4)
  assert.equal(audio.cover(), 0.4)
})

test('snow squeaks in the cold and goes soft near freezing', () => {
  assert.equal(snowAt(SOFT_SNOW_F).squeak, 0)
  assert.equal(snowAt(32).squeak, 0)
  assert.equal(snowAt(SQUEAK_SNOW_F).squeak, 1)
  assert.equal(snowAt(-40).squeak, 1)
  assert.deepEqual(snowAt(undefined), snowAt(SOFT_SNOW_F))
  assert.deepEqual(snowAt(Number.NaN), snowAt(SOFT_SNOW_F))
  const temps = [30, 20, 10, 0, -10]
  temps.slice(1).forEach((t, i) => {
    const [warm, cold] = [snowAt(temps[i]), snowAt(t)]
    assert.ok(cold.freq >= warm.freq && cold.decay <= warm.decay && cold.grains >= warm.grains)
  })
  assert.ok(snowAt(FREEZEUP_F).squeak > 0 && snowAt(FREEZEUP_F).squeak < 1)
})

test('every Act 2 space has an ambience bed; the town is snow, the hotel has the guitar on music', () => {
  Object.entries(act2Soundscapes).forEach(([id, scape]) =>
    assert.ok(scape.layers.some((l) => l.bus === 'ambience'), `${id} has no ambience bed`),
  )
  assert.equal(surfaceAt(act2Soundscapes.town.ground, vec(0, 0)), 'snow')
  assert.equal(act2Soundscapes.town.ground.tempF, FREEZEUP_F)
  assert.ok(act2Soundscapes.town.events.some((e) => e.spot === 'raven'))
  assert.ok(act2Soundscapes.town.layers.some((l) => l.kind === 'idle'))
  assert.ok(act2Soundscapes.base.layers.some((l) => l.kind === 'hum'))
  assert.ok(act2Soundscapes.hotel.layers.some((l) => l.kind === 'guitar' && l.bus === 'music'))
  assert.ok(act2Soundscapes.hotel.layers.some((l) => l.kind === 'recording' && l.clip === 'walla' && l.bus === 'voice'))
  assert.ok(act2Soundscapes.hall.events.some((e) => e.spot === 'perk'))
})

test("Wade's guitar alternates bass and strum and loops its changes", () => {
  assert.ok(strumAt(0).bass && !strumAt(0).strum)
  assert.ok(strumAt(1).strum && !strumAt(1).bass)
  assert.notEqual(strumAt(0).bass, strumAt(2).bass)
  assert.deepEqual(strumAt(16), strumAt(0))
})

test('every Act 2 layer, spot and the snow step build and schedule finite times', () => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const rand = mulberry(7)
  const dest = ctx.createGain()
  Object.values(act2Soundscapes).forEach((scape) => {
    scape.layers.forEach((l) => {
      const v = layerVoice(ctx, buffers, l, rand)
      v.tick?.(1)
      v.tick?.(3)
      v.stop(4)
    })
    scape.events.forEach((e) => assert.ok(Number.isFinite(spot(ctx, buffers, e.spot, dest, rand))))
  })
  ;(['raven', 'perk'] satisfies Spot[]).forEach((s) => assert.ok(spot(ctx, buffers, s, dest, rand) > 1))
  ;[40, FREEZEUP_F, -30, undefined].forEach((t) => assert.ok(footstep(ctx, buffers, 'snow', dest, rand, t) > 1))
  assert.ok(times.t.length > 0)
  assert.ok(times.t.every(Number.isFinite))
})

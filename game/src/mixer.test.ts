import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Volumes } from './mixer.ts'
import {
  BUSES,
  BUS_LABELS,
  COVERED,
  COVER_FLOOR,
  DEFAULT_VOLUMES,
  DUCK,
  DUCKED,
  LIMITER,
  busGain,
  busGains,
  clamp01,
  coverGain,
  parseVolumes,
  serializeVolumes,
  sliderGain,
  withVolume,
} from './mixer.ts'

const full: Volumes = { ambience: 1, sfx: 1, voice: 1, music: 1 }

test('clamp01 pins to [0, 1] and turns anything not finite into silence', () => {
  assert.equal(clamp01(0.4), 0.4)
  assert.equal(clamp01(-2), 0)
  assert.equal(clamp01(7), 1)
  assert.equal(clamp01(Number.NaN), 0)
  assert.equal(clamp01(Number.POSITIVE_INFINITY), 0)
  assert.equal(clamp01(Number.NEGATIVE_INFINITY), 0)
})

test('the slider is a square law: half way is a quarter of the gain', () => {
  assert.equal(sliderGain(0.5), 0.25)
  assert.equal(sliderGain(1), 1)
  assert.equal(sliderGain(0), 0)
  assert.equal(sliderGain(3), 1)
  const steps = [0, 0.1, 0.3, 0.6, 0.9, 1].map(sliderGain)
  steps.slice(1).forEach((g, i) => assert.ok(g > steps[i]!, 'monotonic'))
})

test('cover runs from full voice at none to the floor at full cover, never silent', () => {
  assert.equal(coverGain(0), 1)
  assert.equal(coverGain(1), COVER_FLOOR)
  assert.ok(Math.abs(coverGain(0.5) - (COVER_FLOOR + (1 - COVER_FLOOR) / 2)) < 1e-12)
  assert.equal(coverGain(5), COVER_FLOOR, 'clamped above')
  assert.equal(coverGain(-5), 1, 'clamped below')
  assert.equal(coverGain(Number.NaN), 1, 'no cover when unknown')
})

test('cover only hushes the covered bus', () => {
  assert.equal(COVERED, 'voice')
  BUSES.forEach((b) => {
    const want = b === COVERED ? COVER_FLOOR : 1
    assert.equal(busGain(full, b, false, 1), want, b)
  })
})

test('ducking and cover multiply on the voice bus', () => {
  assert.ok(Math.abs(busGain(full, 'voice', true, 1) - DUCK * COVER_FLOOR) < 1e-12)
  assert.equal(busGain(full, 'music', true, 1), DUCK)
  assert.equal(busGain(full, 'ambience', true, 1), 1)
  assert.equal(busGain(full, 'sfx', true, 1), 1)
  DUCKED.forEach((b) => assert.ok(BUSES.includes(b)))
})

test('busGains has every bus and matches busGain bus by bus', () => {
  const v: Volumes = { ambience: 0.3, sfx: 0.9, voice: 0.5, music: 0.2 }
  const all = busGains(v, true, 0.4)
  assert.deepEqual(Object.keys(all).sort(), [...BUSES].sort())
  BUSES.forEach((b) => assert.equal(all[b], busGain(v, b, true, 0.4)))
})

test('withVolume clamps and leaves the original untouched', () => {
  const next = withVolume(DEFAULT_VOLUMES, 'music', 1.7)
  assert.equal(next.music, 1)
  assert.equal(DEFAULT_VOLUMES.music, 0.6)
  assert.equal(withVolume(DEFAULT_VOLUMES, 'sfx', -1).sfx, 0)
  assert.equal(next.voice, DEFAULT_VOLUMES.voice)
})

test('parseVolumes falls back to the defaults on any malformed save', () => {
  ;[null, undefined, '', 'not json', 'null', '42', '"text"', '[1,2]', 'true'].forEach((raw) =>
    assert.deepEqual(parseVolumes(raw), DEFAULT_VOLUMES, String(raw)),
  )
  assert.deepEqual(parseVolumes('{"music":"0.2","voice":null,"sfx":2,"ambience":-1}'), {
    ...DEFAULT_VOLUMES,
    sfx: 1,
    ambience: 0,
  })
})

test('a serialized mix reads back the same', () => {
  const v: Volumes = { ambience: 0.11, sfx: 0, voice: 1, music: 0.5 }
  assert.deepEqual(parseVolumes(serializeVolumes(v)), v)
})

test('every bus has a label and a default in range', () => {
  BUSES.forEach((b) => {
    assert.ok(BUS_LABELS[b].length > 0)
    assert.ok(DEFAULT_VOLUMES[b] > 0 && DEFAULT_VOLUMES[b] <= 1)
  })
})

test('the limiter catches peaks hard and fast', () => {
  assert.ok(LIMITER.threshold < 0)
  assert.ok(LIMITER.ratio >= 10)
  assert.ok(LIMITER.attack > 0 && LIMITER.attack < LIMITER.release)
})

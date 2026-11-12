import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AUDIO_TIERS, QUALITIES, rebuilds } from './audioTier.ts'
import type { Quality } from './audioTier.ts'
import type { Layer, Soundscape } from './soundscape.ts'
import { act1Soundscapes, act2Soundscapes, soundscapes, tiered } from './soundscape.ts'
import { footstep, layerVoice, makeBuffers, mulberry } from './synth.ts'
import { fakeContext } from './fake-audio.ts'

// Every walla in a bed, the procedural fallback under a recording included.
const wallas = (s: Soundscape): readonly number[] => {
  const of = (l: Layer): readonly number[] =>
    l.kind === 'walla' ? [l.voices] : l.kind === 'recording' ? l.fallback.flatMap(of) : []
  return s.layers.flatMap(of)
}

// Nodes one layer builds on a fresh fake context.
const nodesOf = (l: Layer): number => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const before = times.nodes
  layerVoice(ctx, buffers, l, mulberry(7))
  return times.nodes - before
}

// Nodes a gravel step builds, less the step's own level gain.
const gravelNodes = (q: Quality): number => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const before = times.nodes
  footstep(ctx, buffers, 'gravel', ctx.createGain(), mulberry(5), undefined, undefined, AUDIO_TIERS[q])
  return times.nodes - before - 1
}

const barWalla = (q: Quality): Layer => {
  const l = tiered(soundscapes.bar, AUDIO_TIERS[q]).layers.find((x) => x.kind === 'recording' && x.clip === 'walla')
  assert.ok(l && l.kind === 'recording')
  const w = l.fallback[0]
  assert.ok(w)
  return w
}

test('low builds 4 walla voices and 4 gravel grains; medium and high keep 7 and 7', () => {
  assert.deepEqual(AUDIO_TIERS.low, { wallaVoices: 4, gravelGrains: 4 })
  assert.deepEqual(AUDIO_TIERS.medium, { wallaVoices: 7, gravelGrains: 7 })
  assert.deepEqual(AUDIO_TIERS.high, AUDIO_TIERS.medium)
  assert.deepEqual(wallas(tiered(soundscapes.bar, AUDIO_TIERS.low)), [4])
  assert.deepEqual(wallas(tiered(soundscapes.bar, AUDIO_TIERS.medium)), [7])
  assert.deepEqual(wallas(tiered(soundscapes.bar, AUDIO_TIERS.high)), [7])
})

test('node counts per tier: the bar walla and a gravel step', () => {
  // A walla voice is two shared nodes plus, per voice, a source, two formants, two gains and three LFOs of two nodes.
  const perVoice = (nodesOf(barWalla('medium')) - nodesOf(barWalla('low'))) / 3
  assert.equal(perVoice, 11)
  assert.equal(nodesOf(barWalla('low')), 2 + 4 * perVoice)
  assert.equal(nodesOf(barWalla('medium')), 2 + 7 * perVoice)
  assert.equal(nodesOf(barWalla('high')), nodesOf(barWalla('medium')))
  // A grain is a source, a filter and a gain, after the step's one shared gain.
  assert.equal(gravelNodes('low'), 1 + 4 * 3)
  assert.equal(gravelNodes('medium'), 1 + 7 * 3)
  assert.equal(gravelNodes('high'), gravelNodes('medium'))
})

test('medium is today\'s mix: tiering a bed on medium or high changes nothing', () => {
  const beds = [...Object.values(soundscapes), ...Object.values(act1Soundscapes), ...Object.values(act2Soundscapes)]
  beds.forEach((s) => {
    assert.deepEqual(tiered(s, AUDIO_TIERS.medium), s)
    assert.deepEqual(tiered(s, AUDIO_TIERS.high), s)
  })
})

test('low caps every walla at 4, the barfight and the hotel too, and leaves every other layer alone', () => {
  const beds = [soundscapes.bar, act1Soundscapes.barfight, act2Soundscapes.hotel]
  beds.forEach((s) => {
    const low = tiered(s, AUDIO_TIERS.low)
    assert.ok(wallas(s).length > 0)
    wallas(low).forEach((v) => assert.equal(v, 4))
    assert.equal(low.layers.length, s.layers.length)
    low.layers.forEach((l, i) => {
      if (l.kind !== 'walla' && l.kind !== 'recording') assert.equal(l, s.layers[i])
    })
    assert.equal(low.events, s.events)
    assert.equal(low.ground, s.ground)
  })
})

test('the beds rebuild on a change of space or of tier, and not otherwise', () => {
  assert.equal(rebuilds(undefined, 'bar', 'medium'), true)
  assert.equal(rebuilds({ space: 'bar', quality: 'medium' }, 'bar', 'medium'), false)
  assert.equal(rebuilds({ space: 'bar', quality: 'medium' }, 'room', 'medium'), true)
  assert.equal(rebuilds({ space: 'bar', quality: 'medium' }, 'bar', 'low'), true)
  assert.deepEqual([...QUALITIES], ['low', 'medium', 'high'])
})

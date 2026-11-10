import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Layer } from './soundscape.ts'
import { SOFT_SNOW_F, SQUEAK_SNOW_F } from './footsteps.ts'
import {
  BOOTS,
  CALLS,
  CHANGES,
  TUNE,
  beatAt,
  between,
  bootGain,
  callGain,
  footstep,
  layerVoice,
  makeBuffers,
  midiHz,
  mulberry,
  noiseSamples,
  strumAt,
} from './synth.ts'
import { fakeContext } from './fake-audio.ts'
import { vec } from './world.ts'

const near = (got: number, want: number, what: string) => assert.ok(Math.abs(got - want) < 1e-9, `${what}: ${got} vs ${want}`)

// Builds one layer on a fresh fake context: the voice and how many nodes it took.
const build = (l: Layer) => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const before = times.nodes
  const voice = layerVoice(ctx, buffers, l, mulberry(7))
  return { ctx, times, voice, nodes: times.nodes - before }
}

test('mulberry is deterministic per seed, in [0, 1), and different seeds differ', () => {
  const a = mulberry(42)
  const b = mulberry(42)
  const xs = Array.from({ length: 500 }, () => a())
  assert.deepEqual(xs, Array.from({ length: 500 }, () => b()))
  xs.forEach((x) => assert.ok(x >= 0 && x < 1))
  assert.notEqual(mulberry(1)(), mulberry(2)())
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  assert.ok(Math.abs(mean - 0.5) < 0.05, `mean ${mean}`)
})

test('between stays within its bounds', () => {
  const r = mulberry(3)
  Array.from({ length: 200 }, () => between(r, 2, 5)).forEach((x) => assert.ok(x >= 2 && x < 5))
  assert.equal(between(() => 0, 2, 5), 2)
})

test('midiHz: A4 is 440, an octave doubles, a semitone is the twelfth root of two', () => {
  assert.equal(midiHz(69), 440)
  assert.equal(midiHz(81), 880)
  assert.equal(midiHz(57), 220)
  near(midiHz(70) / midiHz(69), 2 ** (1 / 12), 'semitone')
})

test('the jukebox tune cycles every 16 beats: root on 1 and 3, fifth up on 3, chords on the offbeats', () => {
  Array.from({ length: 32 }, (_, i) => i).forEach((i) => {
    const b = beatAt(i)
    const bar = TUNE[Math.floor(i / 4) % TUNE.length]!
    assert.equal(b.bass, bar.root + (i % 4 === 2 ? 7 : 0), `beat ${i}`)
    assert.equal(b.chord, i % 2 === 1 ? bar.chord : undefined, `beat ${i}`)
    assert.deepEqual(beatAt(i + 16), b)
  })
})

test('the guitar alternates bass and strum, root then fifth, through the changes', () => {
  Array.from({ length: 32 }, (_, i) => i).forEach((i) => {
    const p = strumAt(i)
    const bar = CHANGES[Math.floor(i / 4) % CHANGES.length]!
    if (i % 2 === 0) {
      assert.equal(p.bass, i % 4 === 0 ? bar.root : bar.fifth)
      assert.equal(p.strum, undefined)
    } else {
      assert.equal(p.bass, undefined)
      assert.equal(p.strum, bar.chord)
    }
  })
})

test('noise samples are the length asked, bounded and seeded', () => {
  ;(['white', 'pink', 'brown'] as const).forEach((c) => {
    const s = noiseSamples(c, 4000, 9)
    assert.equal(s.length, 4000)
    assert.ok(s.every((v) => Number.isFinite(v) && Math.abs(v) <= 1), c)
    assert.deepEqual(s, noiseSamples(c, 4000, 9))
    assert.notDeepEqual(s, noiseSamples(c, 4000, 10))
  })
})

test('makeBuffers builds one buffer per noise color', () => {
  const { ctx } = fakeContext()
  assert.deepEqual(Object.keys(makeBuffers(ctx)).sort(), ['brown', 'pink', 'white'])
})

test('a noise layer is a source, a filter and a gain; brown adds a rumble cut, a wobble adds an LFO', () => {
  const base = { kind: 'noise', bus: 'ambience', filter: 'lowpass', freq: 300, gain: 0.2 } as const
  assert.equal(build({ ...base, color: 'pink' }).nodes, 3)
  assert.equal(build({ ...base, color: 'brown' }).nodes, 4)
  assert.equal(build({ ...base, color: 'pink', wobble: { rate: 1, depth: 0.5, on: 'gain' } }).nodes, 5)
  assert.equal(build({ ...base, color: 'brown', wobble: { rate: 1, depth: 0.5, on: 'freq' } }).nodes, 6)
  assert.equal((build({ ...base, color: 'white' }).voice.out as GainNode).gain.value, 0.2)
})

test('walla is eleven nodes a voice plus two, and its level falls as the square root of the crowd', () => {
  ;[1, 4, 7].forEach((voices) => {
    const w = build({ kind: 'walla', bus: 'voice', gain: 1.6, voices })
    assert.equal(w.nodes, 2 + 11 * voices, `${voices} voices`)
    near((w.voice.out as GainNode).gain.value, 1.6 / Math.sqrt(voices), `${voices} voices gain`)
  })
})

test('the fixed layers build a fixed graph', () => {
  const at = vec(0, 0)
  assert.equal(build({ kind: 'reel', bus: 'sfx', gain: 0.2, at }).nodes, 11)
  assert.equal(build({ kind: 'idle', bus: 'ambience', gain: 0.2, at, rpm: 700 }).nodes, 10)
  assert.equal(build({ kind: 'hum', bus: 'ambience', gain: 0.1, buzz: 0.3 }).nodes, 10)
  assert.equal(build({ kind: 'outboard', bus: 'ambience', gain: 0.1, at, rpm: 4200 }).nodes, 9)
  assert.equal(build({ kind: 'jukebox', bus: 'music', gain: 1, at }).nodes, 2)
  assert.equal(build({ kind: 'guitar', bus: 'music', gain: 1 }).nodes, 2)
})

test('stopping a looped layer schedules a stop on every source at the time given', () => {
  const w = build({ kind: 'hum', bus: 'ambience', gain: 0.1, buzz: 0.3 })
  const before = w.times.t.length
  w.voice.stop(9)
  const stops = w.times.t.slice(before)
  assert.equal(stops.length, 4, 'three mains and the ballast')
  stops.forEach((t) => assert.equal(t, 9))
})

test('the jukebox schedules notes ahead on tick, and nothing once stopped', () => {
  const j = build({ kind: 'jukebox', bus: 'music', gain: 1, at: vec(0, 0) })
  j.voice.tick?.(1)
  const first = j.times.nodes
  assert.ok(first > 2, 'notes scheduled')
  j.voice.tick?.(1)
  assert.equal(j.times.nodes, first, 'the same window is not scheduled twice')
  j.voice.stop(2)
  j.voice.tick?.(5)
  assert.equal(j.times.nodes, first, 'silent after stop')
})

test('the guitar strums on tick and stops when told', () => {
  const g = build({ kind: 'guitar', bus: 'music', gain: 1 })
  g.voice.tick?.(1)
  const first = g.times.nodes
  assert.ok(first > 2)
  g.voice.stop(2)
  g.voice.tick?.(10)
  assert.equal(g.times.nodes, first)
})

test('footsteps: one gain plus two bursts on hard ground, seven grains on gravel', () => {
  const step = (surface: Parameters<typeof footstep>[2], tempF?: number) => {
    const { ctx, times } = fakeContext()
    const buffers = makeBuffers(ctx)
    const before = times.nodes
    const end = footstep(ctx, buffers, surface, ctx.createGain(), mulberry(5), tempF)
    return { nodes: times.nodes - before - 1, end, now: ctx.currentTime }
  }
  ;(['wood', 'mud', 'water', 'concrete', 'ski'] as const).forEach((s) => assert.equal(step(s).nodes, 7, s))
  assert.equal(step('gravel').nodes, 22)
  // Soft snow: three grains and the pack; at forty below, seven grains, the pack and the squeak.
  assert.equal(step('snow', SOFT_SNOW_F).nodes, 1 + 3 * 3 + 3)
  assert.equal(step('snow', SQUEAK_SNOW_F).nodes, 1 + 7 * 3 + 3 + 2)
  ;(['wood', 'gravel', 'mud', 'water', 'snow', 'concrete', 'ski'] as const).forEach((s) => {
    const r = step(s, -40)
    assert.ok(Number.isFinite(r.end) && r.end > r.now && r.end < r.now + 2, `${s} ends at ${r.end}`)
  })
})

test('boots peak mid-corridor and match at both ends; each search call is quieter than the last', () => {
  const g = Array.from({ length: BOOTS }, (_, i) => bootGain(i))
  g.forEach((x, i) => near(x, g[BOOTS - 1 - i]!, `boot ${i}`))
  g.forEach((x) => assert.ok(x > 0 && x <= 1))
  assert.equal(callGain(0), 1)
  Array.from({ length: CALLS - 1 }, (_, i) => assert.ok(callGain(i + 1) < callGain(i)))
})

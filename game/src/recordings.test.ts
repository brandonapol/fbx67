import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Clip, Slice } from './recordings.ts'
import { BEDS, SHOTS, SHOT_GAIN, SPOT_TAKES, STEP_TAKES, clipsOf, fileOf, library, loopEnd, pickSlice, slicesOf, urlOf } from './recordings.ts'
import type { Layer, Soundscape } from './soundscape.ts'
import { act1Soundscapes, act2Soundscapes, act3Soundscapes, soundscapes } from './soundscape.ts'
import { takes } from './takes.ts'
import { mulberry } from './synth.ts'

const publicDir = join(import.meta.dirname, '..', 'public')
const sourcesMd = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'audio', 'sources.md'), 'utf8')
const CLIPS: readonly Clip[] = [...BEDS, ...SHOTS]
const BUDGET = 15 * 1024 * 1024

const beds: readonly (readonly [string, Soundscape])[] = [
  ...Object.entries(soundscapes),
  ...Object.entries(act1Soundscapes),
  ...Object.entries(act2Soundscapes),
  ...Object.entries(act3Soundscapes),
]

test('every clip ships as Opus in WebM under public/audio, nothing else is there, and the total is under 15 MB', () => {
  const files = readdirSync(join(publicDir, 'audio')).sort()
  assert.deepEqual(files, CLIPS.map((c) => fileOf(c).replace('audio/', '')).sort())
  const total = CLIPS.reduce((sum, c) => sum + statSync(join(publicDir, fileOf(c))).size, 0)
  assert.ok(total < BUDGET, `${total} bytes`)
  CLIPS.forEach((c) => {
    const head = readFileSync(join(publicDir, fileOf(c))).subarray(0, 4)
    assert.deepEqual([...head], [0x1a, 0x45, 0xdf, 0xa3], `${c} is a Matroska/WebM file`)
  })
})

test('every clip is logged in docs/audio/sources.md as CC0', () => {
  CLIPS.forEach((c) => {
    const row = sourcesMd.split('\n').find((l) => l.startsWith('|') && l.includes(`\`${c}\``))
    assert.ok(row, `${c} has no row`)
    assert.match(row, /CC0/, `${c} is not marked CC0`)
    assert.match(row, /freesound\.org\/s\/\d+/, `${c} has no freesound URL`)
  })
})

test('the generated takes cover every bed and every set, and slices sit in order without overlapping', () => {
  BEDS.forEach((b) => assert.ok(takes.seconds[b] > 1, `${b} loop length`))
  SHOTS.forEach((s) => {
    const slices: readonly Slice[] = slicesOf(s)
    assert.ok(slices.length > 0, `${s} has takes`)
    slices.forEach(([start, len], i) => {
      assert.ok(start >= 0 && len > 0, `${s}[${i}]`)
      if (i) assert.ok(start >= slices[i - 1][0] + slices[i - 1][1], `${s}[${i}] overlaps the take before`)
    })
    assert.ok(SHOT_GAIN[s] > 0 && SHOT_GAIN[s] <= 1, `${s} gain`)
  })
})

test('a bed loops over the cut length even when the decoder pads the end, and never past a short decode', () => {
  assert.equal(loopEnd('creek', takes.seconds.creek + 0.02), takes.seconds.creek)
  assert.equal(loopEnd('creek', 3), 3)
})

const recordingsOf = (layers: readonly Layer[]) => layers.flatMap((l) => (l.kind === 'recording' ? [l] : []))

test('every recorded bed keeps a procedural fallback on its own bus, with no position or recording of its own', () => {
  const all = beds.flatMap(([name, s]) => recordingsOf(s.layers).map((l) => [name, l] as const))
  assert.ok(all.length > 0)
  all.forEach(([name, l]) => {
    assert.ok(BEDS.includes(l.clip), `${name} ${l.clip}`)
    assert.ok(Number.isFinite(l.gain) && l.gain > 0, `${name} ${l.clip} gain`)
    assert.ok(l.fallback.length > 0, `${name} ${l.clip} has no fallback`)
    if (l.alongX) assert.ok(l.at, `${name} ${l.clip} runs along x from a point`)
    l.fallback.forEach((f) => {
      assert.equal(f.bus, l.bus, `${name} ${l.clip} fallback bus`)
      assert.notEqual(f.kind, 'recording', `${name} ${l.clip} nests a recording`)
      assert.ok(!('at' in f && f.at), `${name} ${l.clip} fallback carries its own position`)
    })
  })
})

test('each recording the issue asks for plays in its space', () => {
  const has = (s: Soundscape, clip: Clip) => clipsOf(s).includes(clip)
  ;(['walla', 'clink', 'screen', 'wood'] as const).forEach((c) => assert.ok(has(soundscapes.bar, c), `bar ${c}`))
  ;(['creek', 'spruce', 'gravel'] as const).forEach((c) => assert.ok(has(soundscapes.camp, c), `camp ${c}`))
  ;(['rain', 'flood'] as const).forEach((c) => assert.ok(has(soundscapes.flood, c), `flood ${c}`))
})

test('a space loads only its own clips: the bar never fetches the creek, the silent story space no bed', () => {
  assert.deepEqual(clipsOf(soundscapes.story), ['wood'])
  assert.ok(!clipsOf(soundscapes.bar).includes('creek'))
  assert.ok(!clipsOf(soundscapes.camp).includes('walla'))
  beds.forEach(([name, s]) => {
    const clips = clipsOf(s)
    assert.equal(new Set(clips).size, clips.length, `${name} asks for a clip twice`)
  })
})

test('takes stand in only for spots and surfaces that have them', () => {
  assert.equal(SPOT_TAKES.clink, 'clink')
  assert.equal(SPOT_TAKES.door, undefined, 'interior doors stay procedural')
  assert.equal(STEP_TAKES.wood, 'wood')
  assert.equal(STEP_TAKES.snow, undefined)
  const surfaces = clipsOf({ ground: { surface: 'mud', regions: [{ box: { x: 0, z: 0, w: 1, d: 1 }, surface: 'gravel' }] }, layers: [], events: [] })
  assert.deepEqual(surfaces, ['gravel'], 'a region surface counts')
})

test('urlOf joins the build base with or without its trailing slash', () => {
  assert.equal(urlOf('rain', '/play/'), '/play/audio/rain.webm')
  assert.equal(urlOf('rain', '/play'), '/play/audio/rain.webm')
  assert.equal(urlOf('rain', '/'), '/audio/rain.webm')
})

test('pickSlice never plays the same take twice running and reaches every take', () => {
  const slices: readonly Slice[] = [[0, 1], [1, 1], [2, 1], [3, 1]]
  const rand = mulberry(5)
  const picks = Array.from({ length: 400 }).reduce<number[]>((acc) => [...acc, pickSlice(rand, slices, acc.at(-1))], [])
  picks.forEach((p, i) => {
    assert.ok(p >= 0 && p < slices.length)
    if (i) assert.notEqual(p, picks[i - 1], `take ${p} twice at ${i}`)
  })
  assert.equal(new Set(picks).size, slices.length)
  assert.equal(pickSlice(() => 0.99, [[0, 1]], 0), 0, 'a single take always plays')
})

const settle = () => new Promise((r) => setTimeout(r, 0))

test('the library fetches each clip once, serves it when decoded, and keeps a failure for the session', async () => {
  const calls: Clip[] = []
  const buffer = { duration: 1 } as AudioBuffer
  const lib = library((c) => {
    calls.push(c)
    return c === 'rain' ? Promise.reject(new Error('404')) : Promise.resolve(buffer)
  })
  assert.equal(lib.state('creek'), 'idle')
  lib.want(['creek', 'rain'])
  lib.want(['creek', 'rain'])
  assert.equal(lib.state('creek'), 'loading')
  assert.equal(lib.get('creek'), undefined)
  await settle()
  assert.equal(lib.get('creek'), buffer)
  assert.equal(lib.state('rain'), 'failed')
  assert.equal(lib.get('rain'), undefined)
  lib.want(['rain', 'creek'])
  assert.deepEqual(calls, ['creek', 'rain'])
})

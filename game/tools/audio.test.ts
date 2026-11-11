import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Channels } from './audio.ts'
import { BED_RMS, CEILING, CUTS, KNEE, RATE, SHOT_PEAK, bed, fadeEdges, limit, loopSeam, normalizeRms, pack, peak, rms, shots } from './audio.ts'

const sine = (n: number, period: number, amp = 0.5): Float32Array => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * i) / period))

const near = (got: number, want: number, eps: number, what: string) => assert.ok(Math.abs(got - want) < eps, `${what}: ${got} vs ${want}`)

test('a loop seam runs the last sample straight into the first and leaves the middle untouched', () => {
  const src: Channels = [sine(2000, 97), sine(2000, 61)]
  const out = loopSeam(src, 100, 1500, 200)
  out.forEach((c, k) => {
    assert.equal(c.length, 1500)
    near(c[0], src[k][100 + 1500], 1e-7, 'the head starts where the tail would go on')
    near(c[1499], src[k][100 + 1499], 1e-7, 'the tail is the source')
    near(c[700], src[k][800], 1e-7, 'the middle is the source')
  })
  assert.throws(() => loopSeam(src, 500, 1500, 200), /past the source/)
})

test('a loop seam crossfades at equal power: two uncorrelated beds keep their level through the fade', () => {
  const noise = (seed: number) => {
    const s = { a: seed }
    return Float32Array.from({ length: 40000 }, () => ((s.a = (s.a * 16807) % 2147483647) / 2147483647) * 2 - 1)
  }
  const src: Channels = [noise(7)]
  const out = loopSeam(src, 0, 20000, 10000)
  const level = (a: number, b: number) => rms([out[0].slice(a, b)])
  near(level(0, 10000) / level(10000, 20000), 1, 0.05, 'fade against body')
})

test('a bed normalizes to BED_RMS, and a rare transient is limited, never past the ceiling', () => {
  const quiet = sine(RATE, 480, 0.05)
  quiet[1000] = 0.9
  const out = normalizeRms([quiet], BED_RMS)
  near(rms(out), BED_RMS, 0.01, 'rms')
  assert.ok(peak(out) <= CEILING, `peak ${peak(out)}`)
  const below = limit([Float32Array.of(0.5, -0.7, KNEE)])[0]
  assert.deepEqual([...below], [0.5, -0.7, KNEE].map(Math.fround), 'below the knee nothing moves')
  const above = limit([Float32Array.of(5, -5)])[0]
  assert.ok(above[0] <= CEILING && above[0] > KNEE && above[1] === -above[0])
})

test('bed cuts a seamless loop of the asked length in seconds', () => {
  const ch: Channels = [sine(RATE * 4, 300), sine(RATE * 4, 301)]
  const out = bed(ch, { start: 0.5, length: 2, fade: 0.5 })
  assert.equal(out[0].length, RATE * 2)
  near(rms(out), BED_RMS, 0.01, 'rms')
})

test('takes are faded at both edges, peak-normalized, and packed apart in the order given', () => {
  const faded = fadeEdges([Float32Array.from({ length: 100 }, () => 1)], 10, 20)[0]
  assert.ok(faded[0] < 0.2 && faded[99] < 0.1 && faded[50] === 1)
  const ch: Channels = [sine(RATE * 3, 200, 0.2)]
  const packed = shots(ch, [[0.5, 0.4], [1.5, 0.3], [2, 0.2]])
  assert.equal(packed.slices.length, 3)
  packed.slices.forEach(([start, len], i) => {
    if (i) assert.ok(start > packed.slices[i - 1][0] + packed.slices[i - 1][1], 'a gap between takes')
    const a = Math.round(start * RATE)
    near(peak([packed.channels[0].slice(a, a + Math.round(len * RATE))]), SHOT_PEAK, 0.01, `take ${i} peak`)
  })
  assert.deepEqual(packed.slices.map((s) => s[1]), [0.4, 0.3, 0.2])
  assert.deepEqual(pack([], 0.05).slices, [])
})

test('every cut has a built file, a pinned MD5, and a CC0 row in docs/audio/sources.md with its freesound id', () => {
  const here = import.meta.dirname
  const files = readdirSync(join(here, '..', 'public', 'audio'))
  const md = readFileSync(join(here, '..', '..', 'docs', 'audio', 'sources.md'), 'utf8')
  Object.entries(CUTS).forEach(([name, cut]) => {
    assert.ok(files.includes(`${name}.webm`), `${name}.webm`)
    assert.match(cut.source.md5, /^[0-9a-f]{32}$/, `${name} md5`)
    assert.ok(cut.source.preview.includes(`/${cut.source.id}_`), `${name} preview is its own sound`)
    const row = md.split('\n').find((l) => l.includes(`\`${name}\``) && l.includes(`freesound.org/s/${cut.source.id}/`))
    assert.ok(row && /\bCC0\b/.test(row), `${name} (${cut.source.id}) has no CC0 row`)
  })
})

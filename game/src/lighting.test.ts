import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Weather } from '../../text-game/src/story.ts'
import { spaces } from './levels.ts'
import type { Lighting } from './lighting.ts'
import { bandOf, grades, lighting, skyColor, sunDirection } from './lighting.ts'

const weathers: readonly Weather[] = ['clear', 'dusk', 'night']
const of = (id: keyof typeof spaces, w: Weather): Lighting => lighting(id, spaces[id].season, w)

// docs/art/README.md, Light: the Prologue's sun is north-northwest (330-350), its disc 0 to +4 degrees up.
test('the Prologue sun sits north-northwest, just above the horizon, in every summer space and weather', () => {
  const summer = (Object.keys(spaces) as (keyof typeof spaces)[]).filter((id) => spaces[id].season === 'summer')
  assert.ok(summer.includes('downtown'))
  summer.forEach((id) =>
    weathers.forEach((w) => {
      const l = of(id, w)
      assert.ok(l.sunAzimuth >= 330 && l.sunAzimuth <= 350, `${id} ${w} azimuth ${l.sunAzimuth}`)
      assert.ok(l.sunElevation >= 0 && l.sunElevation <= 4, `${id} ${w} elevation ${l.sunElevation}`)
      assert.equal(l.sunUp, true)
      assert.equal(l.grade, 'summer', 'the Prologue is not banded')
    }),
  )
})

test('summer fog is 30-220 m outdoors and 2-60 m indoors', () => {
  ;(['downtown', 'camp'] as const).forEach((id) => assert.deepEqual([of(id, 'clear').fogStart, of(id, 'clear').fogEnd], [30, 220]))
  ;(['bar', 'room'] as const).forEach((id) => assert.deepEqual([of(id, 'clear').fogStart, of(id, 'clear').fogEnd], [2, 60]))
})

// docs/art/README.md, "Band by season", the Act 1 flood row: sun none; fog 10-120, 8-80, 4-40.
test('the flood takes each band from the Act 1 row: no sun, and its fog range', () => {
  const fog: Readonly<Record<Weather, readonly [number, number]>> = { clear: [10, 120], dusk: [8, 80], night: [4, 40] }
  weathers.forEach((w) => {
    const l = of('flood', w)
    assert.equal(l.grade, bandOf[w])
    assert.equal(l.sunUp, false, `${w}: the flood is overcast`)
    assert.deepEqual([l.fogStart, l.fogEnd], fog[w])
  })
})

test('the flood streetlight is the key at blue hour and danger, in the band key color', () => {
  assert.equal(of('flood', 'clear').lamp, undefined)
  assert.equal(of('flood', 'dusk').lamp?.color, '#ffd9a0')
  assert.equal(of('flood', 'night').lamp?.color, '#ff9a3c')
})

test('each band has its own grade and its own fog color', () => {
  const bands = weathers.map((w) => of('flood', w))
  assert.equal(new Set(bands.map((l) => JSON.stringify(grades[l.grade]))).size, 3)
  assert.equal(new Set(bands.map((l) => l.fog)).size, 3)
})

test('sunDirection reads compass degrees in world axes (x east, z south)', () => {
  const near = (a: readonly number[], b: readonly number[]) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]!) < 1e-9, `${a} vs ${b}`))
  near(sunDirection({ sunAzimuth: 0, sunElevation: 0 }), [0, 0, -1])
  near(sunDirection({ sunAzimuth: 90, sunElevation: 0 }), [1, 0, 0])
  near(sunDirection({ sunAzimuth: 180, sunElevation: 90 }), [0, 1, 0])
})

test('the sky warms toward the sun and holds the fog color below the horizon', () => {
  const l = of('downtown', 'clear')
  const s = sunDirection(l)
  const flat = (d: readonly number[]) => {
    const n = Math.hypot(d[0]!, 0, d[2]!)
    return [d[0]! / n, 0.02, d[2]! / n] as const
  }
  const toward = skyColor(l, flat(s))
  const away = skyColor(l, flat([-s[0], 0, -s[2]]))
  assert.ok(toward[0] - toward[2] > away[0] - away[2] + 0.2, `toward ${toward} away ${away}`)
  const below = skyColor(l, [0, -1, 0]).map((v) => Math.round(v * 255))
  assert.deepEqual(below, [0xc4, 0xaa, 0x9a])
  skyColor(l, [0, 1, 0]).forEach((v) => assert.ok(Number.isFinite(v) && v >= 0 && v <= 1))
})

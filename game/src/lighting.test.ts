import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Weather } from '../../text-game/src/story.ts'
import { season, weather } from '../../text-game/src/story.ts'
import { initialState } from '../../text-game/src/state.ts'
import { replay } from '../../text-game/src/engine.ts'
import type { Clock, SceneId, State } from '../../text-game/src/types.ts'
import { spaces } from './levels.ts'
import type { Band, BandedSeason, Cell, Lighting } from './lighting.ts'
import { MIDNIGHT_SUN, bandBySeason, bandOf, grades, lighting, lightingFor, skyColor, summerSun, sunDirection, timeOf } from './lighting.ts'
import { sunAt } from './sun.ts'

const weathers: readonly Weather[] = ['clear', 'dusk', 'night']
const of = (id: keyof typeof spaces, w: Weather, at?: Clock): Lighting => lighting(id, spaces[id].season, w, at)
const at = (scene: SceneId): State => ({ ...initialState, scene })
const ELEVEN: Clock = '1967-07-14T23:00'

// docs/art/README.md, Light: the Prologue's sun at 11 pm is north-northwest (330-350), its disc 0 to +4 degrees up.
test('the Prologue sun at eleven sits north-northwest, just above the horizon, in every summer space and weather', () => {
  const summer = (Object.keys(spaces) as (keyof typeof spaces)[]).filter((id) => spaces[id].season === 'summer')
  assert.ok(summer.includes('downtown'))
  summer.forEach((id) =>
    [undefined, ELEVEN, '1967-07-14T23:20' as const].forEach((c) =>
      weathers.forEach((w) => {
        const l = of(id, w, c)
        assert.ok(l.sunAzimuth >= 330 && l.sunAzimuth <= 350, `${id} ${w} ${c} azimuth ${l.sunAzimuth}`)
        assert.ok(l.sunElevation >= 0 && l.sunElevation <= 4, `${id} ${w} ${c} elevation ${l.sunElevation}`)
        assert.equal(l.sunUp, true)
        assert.equal(l.grade, 'summer', 'the Prologue is not banded')
      }),
    ),
  )
})

// The one stated cheat: the real sun is down at eleven (docs/fact-checks.md item 38), so the disc is held up; it
// keeps the real azimuth where that is inside the rule's arc.
test('the midnight-sun cheat holds the disc up only while the real sun is below it', () => {
  assert.ok(sunAt(ELEVEN).elevation < 0, 'the real sun is down at eleven')
  assert.deepEqual(summerSun(ELEVEN), { sunAzimuth: sunAt(ELEVEN).azimuth, sunElevation: MIDNIGHT_SUN.elevation })
  // Past midnight the real sun is just east of north; the cheat keeps it at the arc's north end, not its west end.
  assert.ok(sunAt('1967-07-15T00:30').azimuth < 20)
  assert.equal(summerSun('1967-07-15T00:30').sunAzimuth, 350)
  const morning = summerSun('1967-07-15T07:30')
  assert.deepEqual(morning, { sunAzimuth: sunAt('1967-07-15T07:30').azimuth, sunElevation: sunAt('1967-07-15T07:30').elevation })
})

// Same town, another hour: the camp at ten in the morning is lit by the real sun, high in the southeast.
test('the July morning at the camp follows the real sun, not the 11 pm sun', () => {
  const morning = lightingFor(spaces.camp, at('p_camp'))
  const evening = of('camp', 'clear', ELEVEN)
  assert.ok(morning.sunElevation > 30, `elevation ${morning.sunElevation}`)
  assert.ok(morning.sunAzimuth > 90 && morning.sunAzimuth < 180, `azimuth ${morning.sunAzimuth}`)
  assert.equal(morning.sunUp, true)
  assert.deepEqual({ ...morning, sunAzimuth: 0, sunElevation: 0 }, { ...evening, sunAzimuth: 0, sunElevation: 0 }, 'only the sun moves')
})

test('each space is lit at its scene: the bar at eleven, the flood on 14 August, the story backdrop at no hour', () => {
  assert.deepEqual(timeOf(spaces.bar, at('p_bar')), { season: 'summer', clock: '1967-07-14T23:00' })
  assert.deepEqual(timeOf(spaces.flood, at('p_end')), { season: 'flood', clock: '1967-08-14T21:00' })
  assert.deepEqual(timeOf(spaces.story, at('a1_flood')), { season: 'summer' })
  // A scene with no clock keeps the space's own season and the default sun.
  assert.deepEqual(lightingFor(spaces.downtown, at('a2_major')), of('downtown', 'clear'))
})

test('summer fog is 30-220 m outdoors and 2-60 m indoors', () => {
  ;(['downtown', 'camp'] as const).forEach((id) => assert.deepEqual([of(id, 'clear').fogStart, of(id, 'clear').fogEnd], [30, 220]))
  ;(['bar', 'room'] as const).forEach((id) => assert.deepEqual([of(id, 'clear').fogStart, of(id, 'clear').fogEnd], [2, 60]))
})

// docs/art/README.md, "Band by season", the Act 1 flood row: sun none; fog 10-120, 8-80, 4-40. The overcast hides
// the sun at every hour, so the clock does not move the flood's light.
test('the flood takes each band from the Act 1 row: no sun, and its fog range, at any hour', () => {
  const fog: Readonly<Record<Weather, readonly [number, number]>> = { clear: [10, 120], dusk: [8, 80], night: [4, 40] }
  weathers.forEach((w) => {
    const l = of('flood', w, '1967-08-14T21:00')
    assert.equal(l.grade, bandOf[w])
    assert.equal(l.sunUp, false, `${w}: the flood is overcast`)
    assert.deepEqual([l.fogStart, l.fogEnd], fog[w])
    assert.deepEqual(of('flood', w, '1967-08-15T09:00'), l)
  })
})

test('rain falls outdoors in the flood and never indoors', () => {
  weathers.forEach((w) => {
    assert.equal(of('flood', w).rain, true)
    ;(['bar', 'room', 'story'] as const).forEach((id) => assert.equal(lighting(id, 'flood', w).rain, false, `${id} ${w}`))
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

// A brightness of 0 is a black frame: PlayCanvas grades in HDR with brightness as a multiplier.
test('every grade keeps the frame: brightness and contrast near 1, saturation pulled down but not gray', () => {
  Object.entries(grades).forEach(([name, g]) => {
    ;[g.brightness, g.contrast].forEach((v) => assert.ok(v >= 0.6 && v <= 1.4, `${name}: ${v}`))
    assert.ok(g.saturation >= 0.4 && g.saturation <= 1, `${name} saturation ${g.saturation}`)
    assert.ok(g.vignette >= 0 && g.vignette <= 0.6, `${name} vignette ${g.vignette}`)
  })
})

test('indoor fog is darker than the sky haze outside', () => {
  const luma = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
  }
  ;(['bar', 'room'] as const).forEach((id) => assert.ok(luma(of(id, 'clear').fog) < luma(of('downtown', 'clear').fog) / 2, id))
})

// Hiding at the camp sends the story on to p_end (14 August, the flood) while Owen is still on the gravel bar in July:
// the camp keeps the hour of the last scene set there, read from the path, so a rebuild (the probe resets the view
// before every capture) does not lose it.
test('a space keeps the hour of its last scene when the story moves on to another place', () => {
  const path = [3, 1, 1, 1, 3]
  const end = replay(path).at(-1)!
  assert.equal(end.scene, 'p_end')
  assert.deepEqual(timeOf(spaces.camp, end, path), { season: 'summer', clock: '1967-07-15T10:00' })
  assert.deepEqual(lightingFor(spaces.camp, end, path), lightingFor(spaces.camp, at('p_camp')))
  // With no path there to read, the space falls back to its own season and the default sun, never the flood's rain.
  assert.deepEqual(timeOf(spaces.camp, end), { season: 'summer' })
})

// docs/art/README.md, "Band by season", the Act 3 winter row: alpenglow with the sun 0 to +12 degrees at azimuth
// 160-220 and fog 60-240; blue hour with no sun and fog 30-160; sodium in ice fog with no sun and fog 6-70.
const DEEP_WINTER: readonly Clock[] = ['1967-12-21T12:00', '1968-01-15T10:30', '1968-02-15T15:00', '1968-01-02T21:00']
const outside = ['downtown', 'camp', 'flood', 'line'] as const

test('winter takes each band from the Act 3 row, outdoors at any hour', () => {
  const fog: Readonly<Record<Weather, readonly [number, number]>> = { clear: [60, 240], dusk: [30, 160], night: [6, 70] }
  outside.forEach((id) =>
    [undefined, ...DEEP_WINTER].forEach((c) =>
      weathers.forEach((w) => {
        const l = lighting(id, 'winter', w, c)
        assert.equal(l.grade, bandOf[w])
        assert.deepEqual([l.fogStart, l.fogEnd], fog[w], `${id} ${w} ${c}`)
        assert.equal(l.sunUp, w === 'clear', `${id} ${w} ${c}: only the clean band has a sun`)
        assert.equal(l.rain, false)
        if (w !== 'clear') return
        assert.ok(l.sunElevation >= 0 && l.sunElevation <= 12, `${id} ${c} elevation ${l.sunElevation}`)
        assert.ok(l.sunAzimuth >= 160 && l.sunAzimuth <= 220, `${id} ${c} azimuth ${l.sunAzimuth}`)
      }),
    ),
  )
})

// The real solstice sun at noon is about 1.7 degrees up (docs/art/README.md, Light): the clean band keeps it, and
// only clamps the hours when the real sun is down.
test('the winter sun is the real one where it clears the hills, held low in the south where it does not', () => {
  const noon = sunAt('1967-12-21T12:00')
  assert.ok(noon.elevation > 0 && noon.elevation < 3, `solstice noon ${noon.elevation}`)
  const l = lighting('downtown', 'winter', 'clear', '1967-12-21T12:00')
  assert.deepEqual([l.sunAzimuth, l.sunElevation], [noon.azimuth, noon.elevation])
  assert.equal(lighting('downtown', 'winter', 'clear', '1968-01-02T21:00').sunElevation, 0)
})

// At danger nothing past 70 m is visible: linear fog at its end is opaque, and the fog ends the world at one block.
test('winter danger closes the world at 70 m, and each sodium lamp throws a 4 m halo into the ice fog', () => {
  outside.forEach((id) => assert.ok(lighting(id, 'winter', 'night').fogEnd <= 70, id))
  const lamp = lighting('flood', 'winter', 'night').lamp
  assert.equal(lamp?.color, '#ff9a3c')
  assert.equal(lamp?.halo, 4)
  // Ice fog belongs to deep winter only: the flood's rain-night lamp and winter's blue-hour lamp carry no halo.
  assert.equal(lighting('flood', 'flood', 'night').lamp?.halo, undefined)
  assert.equal(lighting('flood', 'winter', 'dusk').lamp?.halo, undefined)
})

test('breath fog and snow load are outdoors in winter only', () => {
  weathers.forEach((w) => {
    outside.forEach((id) => {
      const l = lighting(id, 'winter', w)
      assert.deepEqual([l.breath, l.snowLoad], [true, true], `${id} ${w}`)
      ;(['summer', 'flood'] as const).forEach((s) => assert.deepEqual([lighting(id, s, w).breath, lighting(id, s, w).snowLoad], [false, false]))
    })
    ;(['bar', 'room', 'story'] as const).forEach((id) => {
      const l = lighting(id, 'winter', w)
      assert.deepEqual([l.breath, l.snowLoad, l.rain], [false, false, false], `${id} ${w}`)
    })
  })
})

// docs/art/README.md, "Band by season", read from the README itself so the code's one copy of the table cannot drift.
// A cell is "<key>; sun none; fog **a-b m**" or "<key>; sun **lo to +hi degrees**, azimuth **lo-hi**; fog **a-b m**".
const readme = readFileSync(new URL('../../docs/art/README.md', import.meta.url), 'utf8')
const rowTitle: Readonly<Record<BandedSeason, string>> = { flood: 'Act 1, flood', winter: 'Act 3, winter' }
const columns: readonly Band[] = ['alpenglow', 'blueHour', 'sodium']

const parseCell = (cell: string): Cell => {
  const fog = /fog \*\*(\d+)-(\d+) m\*\*/.exec(cell)
  assert.ok(fog, `no fog range in "${cell}"`)
  const range = [Number(fog[1]), Number(fog[2])] as const
  if (/sun none/.test(cell)) return { fog: range }
  const sun = /sun \*\*(-?\d+) to \+(\d+) degrees\*\*, azimuth \*\*(\d+)-(\d+)\*\*/.exec(cell)
  assert.ok(sun, `no sun in "${cell}"`)
  const [lo, hi, west, east] = sun.slice(1).map(Number) as [number, number, number, number]
  return { sun: { elevation: [lo, hi], azimuth: [west, east] }, fog: range }
}

const readmeRow = (s: BandedSeason): Readonly<Record<Band, Cell>> => {
  const line = readme.split('\n').find((l) => l.startsWith(`| **${rowTitle[s]}**`))
  assert.ok(line, `no ${rowTitle[s]} row in the README's band table`)
  const cells = line.split('|').slice(2, 5).map((c) => c.trim())
  return Object.fromEntries(columns.map((b, i) => [b, parseCell(cells[i]!)])) as Record<Band, Cell>
}

test('the band table in code is the README\'s "Band by season" table, row for row', () => {
  ;(Object.keys(bandBySeason) as BandedSeason[]).forEach((s) => assert.deepEqual(bandBySeason[s], readmeRow(s), s))
})

// Every outdoor space, at every band, takes its fog from the table and has a sun exactly where the cell names one.
test('each banded season lights every outdoor space from its table cell', () => {
  ;(Object.keys(bandBySeason) as BandedSeason[]).forEach((s) =>
    outside.forEach((id) =>
      weathers.forEach((w) => {
        const cell = bandBySeason[s][bandOf[w]]
        const l = lighting(id, s, w, DEEP_WINTER[0])
        assert.deepEqual([l.fogStart, l.fogEnd], cell.fog, `${s} ${id} ${w}`)
        assert.equal(l.sunUp, cell.sun !== undefined, `${s} ${id} ${w}`)
      }),
    ),
  )
})

// The headless check of Act 1 against the text build: each path below is a --choices path (node src/cli.ts --choices
// <path> --last) that reaches the flood in one band. The engine reads season(state) and weather(state) from the
// story and lights the flooded street with that band; it never works the weather out for itself.
const act1: Readonly<Record<Weather, readonly number[]>> = {
  clear: [1, 1, 1, 1, 1, 1],
  dusk: [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 2, 4],
  night: [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 2, 3, 2, 2],
}

test('each Act 1 band is reached on a story path and lights the flooded street from the flood row', () => {
  weathers.forEach((w) => {
    const path = act1[w]
    const s = replay(path).at(-1)!
    assert.equal(season(s), 'flood', `${path}: the story is in the flood`)
    assert.equal(weather(s), w, `${path}: the story's weather`)
    const l = lightingFor(spaces.flood, s, path)
    assert.equal(timeOf(spaces.flood, s, path).season, 'flood')
    assert.equal(l.grade, bandOf[w])
    assert.deepEqual([l.fogStart, l.fogEnd], bandBySeason.flood[bandOf[w]].fog)
    assert.equal(l.rain, true)
    // Owen's room ('room') is lit by its practical whatever the weather outside.
    assert.equal(lightingFor(spaces.room, s, path).lamp?.color, '#ffd29a')
  })
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Clock } from '../../text-game/src/types.ts'
import { sunAt } from './sun.ts'

const near = (got: number, want: number, tol: number, what: string) =>
  assert.ok(Math.abs(got - want) <= tol, `${what}: ${got.toFixed(2)} vs ${want} (± ${tol})`)

// docs/fact-checks.md item 38 and docs/art/README.md, Light: at 64.84 N, 147.72 W, 23:00 standard time (UTC-10).
test('at eleven in July the real sun is -1.5 / -3.0 / -6.3 degrees on the 1st / 15th / 31st, in the north-northwest', () => {
  const ref: readonly (readonly [Clock, number])[] = [
    ['1967-07-01T23:00', -1.5],
    ['1967-07-15T23:00', -3.0],
    ['1967-07-31T23:00', -6.3],
  ]
  ref.forEach(([c, el]) => {
    const s = sunAt(c)
    near(s.elevation, el, 0.2, `${c} elevation`)
    assert.ok(s.azimuth > 330 && s.azimuth < 360, `${c} azimuth ${s.azimuth}`)
  })
})

// docs/art/README.md, Light: about 1.7 degrees at noon on the solstice, 10-12 by mid-February, past 20 by mid-March,
// near 40 by early May.
test('the noon sun climbs from 1.7 degrees at the solstice to near 40 in May, due south', () => {
  const noon = (date: string) => sunAt(`${date}T12:10` as Clock)
  near(noon('1967-12-21').elevation, 1.7, 0.2, 'solstice')
  const feb = noon('1968-02-15').elevation
  assert.ok(feb >= 10 && feb <= 12.5, `mid-February ${feb}`)
  assert.ok(noon('1968-03-15').elevation > 20, 'mid-March')
  near(noon('1968-05-05').elevation, 40, 2, 'early May')
  ;['1967-12-21', '1968-02-15', '1968-03-15', '1968-05-05'].forEach((d) => near(noon(d).azimuth, 183, 5, `${d} azimuth`))
})

// Solar noon in mid-July falls near 11:57 standard time (147.72 W is about nine minutes east of the zone's 150 W
// meridian, less about six minutes of the equation of time), so at 10:00 the sun is well east of south and well up.
test('the July morning sun at the camp is high in the southeast, not the 11 pm sun', () => {
  const s = sunAt('1967-07-15T10:00')
  assert.ok(s.elevation > 35 && s.elevation < 48, `elevation ${s.elevation}`)
  assert.ok(s.azimuth > 130 && s.azimuth < 155, `azimuth ${s.azimuth}`)
})

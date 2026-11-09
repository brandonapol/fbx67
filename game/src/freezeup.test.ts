import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Clock } from '../../text-game/src/types.ts'
import type { Season } from '../../text-game/src/story.ts'
import { seasonOn } from '../../text-game/src/queries.ts'
import { STAGES, birches, cars, puddles, stageOf, standing, townLayer } from './freezeup.ts'
import { doors, legs, spawns } from './downtown.ts'
import { RADIUS, hits, vec } from './world.ts'

const seasons: readonly Season[] = ['summer', 'flood', 'freezeup', 'winter', 'breakup']

test('freeze-up comes in stages through September to November, each inside the story season', () => {
  STAGES.forEach(([stage, m, d]) => {
    const c = `1967-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00` as Clock
    assert.equal(seasonOn(c), 'freezeup', `${stage} starts in freeze-up`)
    assert.equal(stageOf('freezeup', c), stage)
  })
  const on: readonly (readonly [Clock, string])[] = [
    ['1967-09-12T08:30', 'frost'],
    ['1967-09-30T12:00', 'bare'],
    ['1967-10-15T12:00', 'snow'],
    ['1967-11-20T12:00', 'skim'],
  ]
  on.forEach(([c, s]) => assert.equal(stageOf(seasonOn(c), c), s, c))
  assert.equal(stageOf('freezeup'), 'frost', 'a freeze-up scene with no clock shows the first stage')
  assert.equal(stageOf('summer', '1967-07-14T23:00'), undefined)
  assert.equal(stageOf('flood', '1967-08-15T09:00'), undefined)
  assert.equal(stageOf('winter', '1967-12-21T12:00'), 'skim', 'deep winter keeps every freeze-up layer')
})

const kinds = (season: Season, c?: Clock) => {
  const layer = townLayer(season, c)
  const ice = layer.filter((p) => p.color === '#c4d2da').length
  const snow = layer.filter((p) => p.color === '#dfe2e6').length
  const smoke = layer.filter((p) => p.color === '#c8c6c4').length
  const cords = layer.filter((p) => p.color === '#1e1e1e').length
  const river = layer.filter((p) => p.color === '#cfd7dc' || p.color === '#d6dde2').length
  const crowns = layer.filter((p) => birches.some(([x, z]) => p.box.x === x && p.box.z === z))
  return { ice, snow, smoke, cords, river, crowns }
}

test('July and the flood show the town in leaf, with no ice, snow or smoke', () => {
  ;(['summer', 'flood'] as const).forEach((s) => {
    const k = kinds(s)
    assert.deepEqual([k.ice, k.snow, k.smoke, k.cords, k.river], [0, 0, 0, 0, 0], s)
    assert.equal(k.crowns.length, birches.length)
    k.crowns.forEach((c) => assert.equal(c.color, '#5b7a3a', `${s}: green birches`))
  })
})

test('freeze-up: ice in the puddles, then bare birches, then the first snow and plug-ins, then the river skims over', () => {
  const frost = kinds('freezeup', '1967-09-12T08:30')
  assert.equal(frost.ice, puddles.length)
  assert.ok(frost.smoke > 0, 'chimney smoke from the first cold')
  assert.equal(frost.snow, 0)
  frost.crowns.forEach((c) => assert.equal(c.color, '#c9a83a', 'the birches have turned'))

  const bare = kinds('freezeup', '1967-09-30T12:00')
  bare.crowns.forEach((c) => assert.equal(c.shape, 'cone', 'the birches are bare'))
  assert.equal(bare.cords, 0)

  const snow = kinds('freezeup', '1967-10-15T12:00')
  assert.ok(snow.snow > 1, 'snow on the lots and the roofs')
  assert.equal(snow.cords, cars.length, 'every parked car is plugged in')
  assert.equal(snow.river, 0)

  assert.ok(kinds('freezeup', '1967-11-20T12:00').river > 0, 'the river is skimming over')
})

test('no season layer is solid, so the season never changes where anyone can walk', () => {
  seasons.forEach((s) => townLayer(s, '1967-11-20T12:00').forEach((p) => assert.ok(!p.solid, `${s} ${JSON.stringify(p.box)}`)))
})

// Freeze-up's ground sits on the lot, above the roadway (0.03) and below the walks (0.06), so neither shows through.
test('puddle ice lies between the roadway and the walks; lot snow under the roadway', () => {
  const layer = townLayer('freezeup', '1967-11-20T12:00')
  layer.filter((p) => p.color === '#c4d2da').forEach((p) => assert.ok(p.h > 0.03 && p.h < 0.06 && p.flat))
  const lots = layer.filter((p) => p.color === '#dfe2e6' && p.y === undefined)
  assert.equal(lots.length, 1)
  lots.forEach((p) => assert.ok(p.h < 0.03 && p.flat))
})

// The cars and trunks are solid in every season: none may stand on a walk the prologue plays, at a spawn or a door.
test('parked cars and birch trunks keep clear of every leg, spawn and door', () => {
  const solid = standing.filter((p) => p.solid).map((p) => p.box)
  const points = [
    ...legs.flatMap((l) =>
      l.route.slice(1).flatMap(([x1, z1], i) => {
        const [x0, z0] = l.route[i]!
        const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25)
        return Array.from({ length: n + 1 }, (_, k) => vec(x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n))
      }),
    ),
    ...spawns.map((s) => vec(s.x, s.z)),
    ...doors.map((d) => d.at),
  ]
  points.forEach((p) => solid.forEach((b) => assert.ok(!hits(p, b, RADIUS + 0.1), `(${p.x}, ${p.z}) hits ${JSON.stringify(b)}`)))
})

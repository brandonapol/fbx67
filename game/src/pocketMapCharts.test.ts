import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pieces as basePieces } from './eielson.ts'
import { pieces as townPieces } from './downtown.ts'
import type { Chart } from './pocketMapCharts.ts'
import { baseChart, townChart } from './pocketMapCharts.ts'

type Flat = Readonly<{ box: Readonly<{ x: number; z: number; w: number; d: number }>; flat?: boolean }>

const paved = (ps: readonly Flat[], x: number, z: number): boolean =>
  ps.some((p) => p.flat && Math.abs(x - p.box.x) <= p.box.w / 2 && Math.abs(z - p.box.z) <= p.box.d / 2)

// Every 5 m down the middle of each way's roadway there is ground the level actually lays: the chart and the level
// cannot drift apart.
const laid = (c: Chart, ps: readonly Flat[]) =>
  c.ways.forEach((w) => {
    const [x0, x1, z0, z1] = w.road
    const n = Math.floor((w.runs === 'ew' ? x1 - x0 : z1 - z0) / 5)
    Array.from({ length: n + 1 }, (_, i): readonly [number, number] => (w.runs === 'ew' ? [x0 + i * 5, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + i * 5])).forEach(([x, z]) =>
      assert.ok(paved(ps, x, z), `${c.id}: ${w.name} at (${x}, ${z})`),
    )
  })

test('the town chart\'s ways are the roads downtown.ts lays', () => laid(townChart, townPieces))

test('the base chart\'s ways are the roads eielson.ts lays', () => laid(baseChart, basePieces))

test('every spot\'s door is on or at the edge of its building', () =>
  [townChart, baseChart].forEach((c) =>
    c.spots.forEach((s) => {
      const [x0, x1, z0, z1] = s.rect
      assert.ok(s.door.x >= x0 && s.door.x <= x1 && s.door.z >= z0 && s.door.z <= z1, `${c.id}: ${s.id}`)
    }),
  ))

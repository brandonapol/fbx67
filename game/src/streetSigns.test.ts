import { test } from 'node:test'
import assert from 'node:assert/strict'
import { avenues, blocks, buildings, doors, legs, spawns, streets } from './downtown.ts'
import type { Rect } from './downtown.ts'
import { slots } from './ambient.ts'
import { spaces } from './levels.ts'
import { CURB_SET, POST_H, READ_WITHIN, bladeText, readable, signProps, signs, streetSigns } from './streetSigns.ts'
import type { Vec } from './world.ts'
import { distance, vec } from './world.ts'

const inside = (r: Rect, p: Vec, pad = 0): boolean => p.x >= r[0] - pad && p.x <= r[1] + pad && p.z >= r[2] - pad && p.z <= r[3] + pad

// The crossings, read straight off the town map's street table: every street meets every avenue its length reaches.
const expected = streets.flatMap((s) =>
  avenues.filter((a) => a.x[0] < s.road[1] && a.x[1] > s.road[0] && s.z[0] < a.road[1] && s.z[1] > a.road[0]).map((a) => `${s.name}|${a.name}`),
)

test('a sign stands at every corner where an avenue crosses a street, and nowhere else', () => {
  assert.deepEqual(signs.map((s) => `${s.street.name}|${s.avenue.name}`).sort(), [...expected].sort())
  assert.equal(signs.length, 10, 'Cushman crosses First to Fourth; Lacey and Noble cross First to Third')
  assert.equal(new Set(signs.map((s) => s.id)).size, signs.length)
})

test('each sign names its own two ways, in the capitals of a period street sign', () => {
  signs.forEach((s) => assert.deepEqual(s.texts, [bladeText(s.avenue.name), bladeText(s.street.name)]))
  assert.equal(bladeText('Second Avenue'), 'SECOND AVE')
  assert.equal(bladeText('Cushman Street'), 'CUSHMAN ST')
  assert.ok(signs.some((s) => s.texts.join(' / ') === 'SECOND AVE / CUSHMAN ST'))
})

test('each post stands on the southeast corner walk, off both roadways and clear of every building and block', () => {
  signs.forEach((s) => {
    const st = streets.find((x) => x.name === s.street.name)!
    const av = avenues.find((x) => x.name === s.avenue.name)!
    assert.equal(s.at.x, st.road[1] + CURB_SET, s.id)
    assert.equal(s.at.z, av.road[1] + CURB_SET, s.id)
    assert.ok(s.at.x < st.row[1] && s.at.z < av.row[1], `${s.id} is inside both rights of way`)
    buildings.forEach((b) => assert.ok(!inside(b.rect, s.at, 0.5), `${s.id} clears ${b.id}`))
    blocks.forEach((b) => assert.ok(!inside(b.rect, s.at, 0.5), `${s.id} clears block ${b.id}`))
  })
})

test('no post blocks a spawn, a door, an ambient slot or a walked leg', () => {
  const near = (p: Vec, what: string, r: number) => signs.forEach((s) => assert.ok(distance(s.at, p) > r, `${s.id} is clear of ${what}`))
  spawns.forEach((p) => near(vec(p.x, p.z), `spawn ${p.id}`, 1.5))
  doors.forEach((d) => near(d.at, `door ${d.id}`, d.r + 0.5))
  slots.forEach((sl) => near(sl.at, `slot ${sl.id}`, 1))
  legs.forEach((l) =>
    l.route.slice(1).forEach(([x, z], i) => {
      const [x0, z0] = l.route[i]!
      const r: Rect = [Math.min(x0, x), Math.max(x0, x), Math.min(z0, z), Math.max(z0, z)]
      signs.forEach((s) => assert.ok(!inside(r, s.at, 1), `${s.id} is clear of the walk from ${l.from}`))
    }),
  )
})

test('the posts are solid and stand downtown and in the flooded street; the blades sit at the top', () => {
  const [post, ...blades] = signProps(signs[0]!)
  assert.ok(post!.solid)
  assert.equal(post!.h, POST_H)
  blades.forEach((b) => assert.ok(!b.solid && (b.y ?? 0) + b.h <= POST_H))
  streetSigns.forEach((p) => {
    assert.ok(spaces.downtown.props.includes(p))
    assert.ok(spaces.flood.props.includes(p))
  })
})

test('the signs readable from a point are the near ones, nearest first', () => {
  const corner = signs.find((s) => s.id === 'Cushman@Second')!
  const r = readable(vec(corner.at.x + 3, corner.at.z))
  assert.equal(r[0], corner)
  r.forEach((s) => assert.ok(distance(s.at, vec(corner.at.x + 3, corner.at.z)) <= READ_WITHIN))
  assert.deepEqual(readable(vec(120, -18)), [], 'nothing to read out on the float dock')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Place } from '../../text-game/src/types.ts'
import type { Game } from './prologue.ts'
import { JOG, press, start, tick } from './prologue.ts'
import { DT } from './drive.ts'
import { DORM, FLOOR, LAB, SQUADRON, clear, doors, eielson, legsOf, nav, navRoute, patrolAt, patrols, spawnAt, spawns } from './eielson.ts'
import { solids, spaces, standAt } from './levels.ts'
import { blocked, distance, sub, vec } from './world.ts'
import type { Vec } from './world.ts'

const map = readFileSync(new URL('../../docs/base-map.md', import.meta.url), 'utf8')

const section = (heading: string): string => {
  const from = map.indexOf(`\n${heading}\n`)
  assert.ok(from >= 0, `docs/base-map.md has no ${heading}`)
  const rest = map.slice(from + heading.length + 2)
  const end = rest.search(/\n#{2,3} /)
  return end < 0 ? rest : rest.slice(0, end)
}

const nums = (cell: string): readonly number[] => (cell.match(/[-−]?\d+(\.\d+)?/g) ?? []).map((n) => Number(n.replace('−', '-')))

const rows = (heading: string): readonly (readonly string[])[] =>
  section(heading)
    .split('\n')
    .filter((l) => /^\| `/.test(l))
    .map((l) => l.split('|').map((c) => c.trim()))

const spawnRows = rows('## Spawn points').map((c) => ({ id: c[1]!.replace(/`/g, ''), at: nums(c[2]!), facing: nums(c[3]!) }))

// The place ids the base map's Places table names, the ones in the Place type and the proposals alike.
const placeIds = rows('## Places').map((c) => c[1]!.replace(/`/g, ''))

// The base places in the story's Place type; the compiler holds the list to the type.
const basePlaces = ['eielsonBarracks', 'majorsOffice', 'squadronBuilding', 'photoLab', 'photoRecords', 'baseHangar'] as const satisfies readonly Place[]

const scene = solids(eielson)

test('the base is registered as its own space, in world coordinates off the base map', () => {
  assert.equal(spaces.eielson, eielson)
  assert.deepEqual(eielson.spawn, vec(86, -50))
})

test('every spawn point in docs/base-map.md is in the level at the same spot and facing, and no other', () => {
  assert.ok(spawnRows.length >= 9, 'the spawn table did not parse')
  assert.deepEqual(spawns.map((s) => s.id).sort(), spawnRows.map((r) => r.id).sort())
  spawnRows.forEach((r) => {
    const s = spawnAt(r.id)
    assert.deepEqual([s.x, s.y, s.z], r.at, `${r.id} position`)
    assert.deepEqual([s.facing.x, s.facing.z], r.facing, `${r.id} facing`)
  })
})

test('every base place id has a spawn point in the level', () => {
  assert.deepEqual(placeIds, ['eielsonGate', 'eielsonBarracks', 'squadronBuilding', 'majorsOffice', 'photoLab', 'photoRecords', 'baseHangar', 'munitionsFence'])
  ;[...placeIds, ...basePlaces].forEach((p) => assert.ok(spawns.some((s) => s.id === p), `${p} has no spawn`))
})

test('every spawn stands clear of the collision, on the floor the base map gives it', () => {
  spawns.forEach((s) => {
    const at = vec(s.x, s.z)
    assert.equal(blocked(at, scene), false, `${s.id} is inside a solid`)
    assert.equal(standAt(eielson, at), s.y, `${s.id} stands at ${standAt(eielson, at)}`)
  })
  assert.equal(FLOOR, 0.3)
})

test('every door is a gap in its wall: open at the door, wall a step to either side along it', () => {
  doors.forEach((d) => {
    const along = d.along === 'x' ? vec(1, 0) : vec(0, 1)
    const side = (k: number): Vec => vec(d.at.x + along.x * k, d.at.z + along.z * k)
    assert.equal(blocked(d.at, scene), false, `${d.id} is shut`)
    assert.ok(blocked(side(1.2), scene) && blocked(side(-1.2), scene), `${d.id} is not in a wall`)
  })
})

test('the outer walls of the dorm, the squadron building and the photo lab stop Wade except at their doors', () => {
  ;[DORM, SQUADRON, LAB].forEach(([x0, x1, z0, z1]) => {
    const mid = vec((x0 + x1) / 2 + 0.7, z0)
    assert.ok(blocked(mid, scene), `${x0},${z0}: the north wall is open`)
    assert.ok(blocked(vec(x1, (z0 + z1) / 2 + 3.3), scene), `${x1}: the east wall is open`)
  })
})

test('the nav graph: every spawn is a node, every edge is clear of the collision, and every node reaches every other', () => {
  spawns.forEach((s) => assert.deepEqual(nav.nodes[s.id], vec(s.x, s.z), s.id))
  nav.edges.forEach(([a, b]) => {
    assert.ok(nav.nodes[a] && nav.nodes[b], `${a}-${b} names a missing node`)
    assert.ok(clear(nav.nodes[a]!, nav.nodes[b]!, scene), `${a}-${b} runs through a solid`)
  })
  const ids = Object.keys(nav.nodes)
  ids.forEach((id) => assert.ok(navRoute('eielsonBarracks', id).length > 0, id))
})

test('a nav route runs node to node over edges, and a closed wall is not one', () => {
  const r = navRoute('eielsonBarracks', 'majorsOffice')
  assert.deepEqual(r[0], vec(86, -50))
  assert.deepEqual(r.at(-1), vec(182, -62))
  assert.equal(clear(vec(86, -50), vec(182, -62), scene), false)
  assert.throws(() => navRoute('eielsonBarracks', 'nowhere'), /no nav node nowhere/)
})

test('every patrol leg is walkable, and P1 runs the base map loop of about 1,150 m', () => {
  assert.deepEqual(patrols.map((p) => p.id), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
  patrols.forEach((p) => legsOf(p).forEach(([a, b]) => assert.ok(clear(a, b, scene), `${p.id}: ${a.x},${a.z} to ${b.x},${b.z}`)))
  const p1 = patrols[0]!
  const loop = legsOf(p1).reduce((s, [a, b]) => s + distance(a, b), 0)
  assert.ok(Math.abs(loop - 1150) / 1150 < 0.1, `P1 is ${loop} m`)
  assert.ok(Math.abs(loop / p1.speed / 60 - 5) < 0.5, 'P1 takes about five minutes')
})

test('a patrol starts at its first point and is back there after one round', () => {
  patrols.forEach((p) => {
    const round = legsOf(p).reduce((s, [a, b]) => s + distance(a, b), 0) / p.speed
    assert.ok(distance(patrolAt(p, 0), p.path[0]!) < 1e-9, p.id)
    assert.ok(distance(patrolAt(p, round), p.path[0]!) < 1e-6, p.id)
    assert.ok(distance(patrolAt(p, round / 2), p.path[0]!) > 1, p.id)
  })
})

// Wade walks from his room to the squadron lot on the game's own movement: tick by tick, through the collision, every
// step no longer than a jog covers in a tick, never leaving the space. No teleport, no cut.
const onBase = (at: Vec): Game => ({ ...press(start(), 'close'), space: 'eielson', pos: at, facing: Math.PI / 2, view: Math.PI / 2 })

const MAX_TICKS = 30 * 60

const walkTracked = (g: Game, points: readonly Vec[]): Readonly<{ end: Game; longest: number; ticks: number }> =>
  points.reduce(
    (acc, to) => {
      const go = (cur: Game, n: number, longest: number): Readonly<{ end: Game; longest: number; ticks: number }> => {
        if (distance(cur.pos, to) < 0.15) return { end: cur, longest, ticks: acc.ticks + n }
        if (n > MAX_TICKS) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} walking to ${to.x},${to.z}`)
        const next = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
        assert.equal(next.space, 'eielson')
        assert.equal(next.panel, undefined)
        return go(next, n + 1, Math.max(longest, distance(cur.pos, next.pos)))
      }
      return go(acc.end, 0, acc.longest)
    },
    { end: g, longest: 0, ticks: 0 },
  )

test('a headless walk from Wade’s room in the barracks to the squadron building, with no teleport', () => {
  const from = spawnAt('eielsonBarracks')
  const to = spawnAt('squadronBuilding')
  const route = navRoute('eielsonBarracks', 'squadronBuilding')
  const walked = walkTracked(onBase(vec(from.x, from.z)), route.slice(1))
  assert.ok(distance(walked.end.pos, vec(to.x, to.z)) < 0.15)
  assert.ok(walked.longest <= JOG * DT + 1e-9, `a step of ${walked.longest} m`)
  const length = route.slice(1).reduce((s, p, i) => s + distance(route[i]!, p), 0)
  assert.ok(walked.ticks * DT * JOG >= length, 'covered the distance on foot')
  assert.ok(length > 100 && length < 220, `${length} m`)
  assert.equal(standAt(eielson, walked.end.pos), 0)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Place } from '../../text-game/src/types.ts'
import { replay } from '../../text-game/src/engine.ts'
import { place } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, press, start } from './prologue.ts'
import { leaveBar, talk, walk, walkLeg } from './drive.ts'
import { BRIDGE, PLAY, buildings, doors, gaps, legs, pieces, placements, spawnAt, spawns, toWorld, yawOf } from './downtown.ts'
import { spaces, solids } from './levels.ts'
import { blocked, distance, hits, vec } from './world.ts'

const map = readFileSync(new URL('../../docs/town-map.md', import.meta.url), 'utf8')

const section = (heading: string): string => {
  const from = map.indexOf(`\n${heading}\n`)
  assert.ok(from >= 0, `docs/town-map.md has no ${heading}`)
  const rest = map.slice(from + heading.length + 2)
  const end = rest.search(/\n#{2,3} /)
  return end < 0 ? rest : rest.slice(0, end)
}

const nums = (cell: string): readonly number[] => (cell.match(/[-−]?\d+(\.\d+)?/g) ?? []).map((n) => Number(n.replace('−', '-')))

type Row = Readonly<{ id: string; at: readonly number[]; facing: readonly number[] }>

const spawnRows: readonly Row[] = section('## Spawn points')
  .split('\n')
  .filter((l) => /^\| `/.test(l))
  .map((l) => {
    const cells = l.split('|').map((c) => c.trim())
    return { id: cells[1]!.replace(/`/g, ''), at: nums(cells[2]!), facing: nums(cells[3]!) }
  })

const offMap: readonly string[] = [...section('### Real landmarks').matchAll(/^- `([A-Za-z]+)`:/gm)].map((m) => m[1]!)

// Every story place, checked against the Place type in both directions.
const places = [
  'silverPan',
  'owensRoom',
  'floatDock',
  'surveyCamp',
  'boardingHouse',
  'floodedStreet',
  'floodCabin',
  'helpTent',
  'landOffice',
  'cityJail',
  'eielsonBarracks',
] as const satisfies readonly Place[]
const everyPlace: [Exclude<Place, (typeof places)[number]>] extends [never] ? true : false = true

const scene = solids(spaces.downtown)

test('every spawn point in docs/town-map.md is in the scene at the same spot and facing, and no other', () => {
  assert.ok(spawnRows.length >= 10, 'the spawn table did not parse')
  assert.deepEqual(spawns.map((s) => s.id).sort(), spawnRows.map((r) => r.id).sort())
  spawnRows.forEach((r) => {
    const s = spawnAt(r.id)
    assert.deepEqual([s.x, s.y, s.z], r.at, `${r.id} position`)
    assert.deepEqual([s.facing.x, s.facing.z], r.facing, `${r.id} facing`)
  })
})

test('every story place has a spawn point in the scene, or the town map names it as off the walkable map', () => {
  assert.ok(everyPlace)
  places.forEach((p) => {
    const spawned = spawns.some((s) => s.id === p)
    const off = offMap.includes(p)
    assert.ok(spawned !== off, `${p}: ${spawned ? 'has a spawn and is listed off the map' : 'has no spawn and is not listed off the map'}`)
  })
})

test('a street spawn stands clear of every solid inside the play area; an interior one stands inside its building', () => {
  spawns.forEach((s) => {
    const at = vec(s.x, s.z)
    if (s.inside) {
      const b = buildings.find((x) => x.id === s.inside)!
      assert.ok(s.x > b.rect[0] && s.x < b.rect[1] && s.z > b.rect[2] && s.z < b.rect[3], `${s.id} is not inside ${s.inside}`)
      return
    }
    assert.ok(s.x > PLAY[0] && s.x < PLAY[1] && s.z > PLAY[2] && s.z < PLAY[3], `${s.id} is outside the play area`)
    assert.equal(blocked(at, scene), false, `${s.id} is inside a solid`)
  })
})

test('the interiors sit on the map where the town map says: their spawns land on the matching spawn points', () => {
  const placed = (space: 'bar' | 'room' | 'flood') => toWorld(placements.find((p) => p.space === space)!, spaces[space].spawn)
  const same = (a: { x: number; z: number }, id: string) => assert.ok(distance(a, spawnAt(id)) < 1e-9, `${id}: ${a.x},${a.z}`)
  same(placed('bar'), 'silverPan')
  same(placed('room'), 'owensRoom')
  same(placed('flood'), 'floodedStreet')
  const barDoor = spaces.bar.spots.find((s) => s.id === 'door')!
  const door = toWorld(placements[0]!, barDoor)
  assert.equal(door.x, buildings.find((b) => b.id === 'silverPan')!.door!.x)
})

test('gaps cuts spans out of a range and keeps the rest in order', () => {
  assert.deepEqual(gaps(0, 10, [[6, 7], [2, 3]]), [[0, 2], [3, 6], [7, 10]])
  assert.deepEqual(gaps(0, 10, [[-1, 1], [9, 12]]), [[1, 9]])
  assert.deepEqual(gaps(0, 10, [[2, 5], [4, 6]]), [[0, 2], [6, 10]])
  assert.deepEqual(gaps(0, 10, []), [[0, 10]])
})

test('no two flat pieces of street share a top where they overlap, so nothing z-fights', () => {
  const flat = pieces.filter((p) => p.flat)
  const top = (p: (typeof flat)[number]) => (p.y ?? 0) + p.h
  const overlap = (a: (typeof flat)[number], b: (typeof flat)[number]) =>
    Math.abs(a.box.x - b.box.x) * 2 < a.box.w + b.box.w - 1e-6 && Math.abs(a.box.z - b.box.z) * 2 < a.box.d + b.box.d - 1e-6
  flat.forEach((a, i) =>
    flat.slice(i + 1).forEach((b) => {
      if (overlap(a, b) && a.color !== b.color) assert.notEqual(top(a), top(b), `${JSON.stringify(a.box)} and ${JSON.stringify(b.box)}`)
    }),
  )
})

test('the river blocks Owen except on the bridge deck and the float', () => {
  assert.ok(blocked(vec(50, -30), scene), 'open water')
  assert.ok(!blocked(vec(0, -30), scene), 'the bridge deck')
  assert.ok(blocked(vec(BRIDGE[1] + 0.1, -30), scene), 'the bridge rail')
  assert.ok(!blocked(vec(119, -16), scene), 'the float')
  assert.ok(!blocked(vec(40, -7), scene), 'the bank')
})

test('every building is solid, and its front door is on its own wall', () => {
  buildings.forEach((b) => {
    const mid = vec((b.rect[0] + b.rect[1]) / 2, (b.rect[2] + b.rect[3]) / 2)
    assert.ok(scene.some((s) => hits(mid, s)), `${b.id} is not solid`)
    if (!b.door) return
    const [x0, x1, z0, z1] = b.rect
    const onWall = ((b.door.z === z0 || b.door.z === z1) && b.door.x >= x0 && b.door.x <= x1) || ((b.door.x === x0 || b.door.x === x1) && b.door.z >= z0 && b.door.z <= z1)
    assert.ok(onWall, `${b.id}'s door is not on its wall`)
  })
})

const night = (): Game => leaveBar(talk(start(), 'texas'))

test('the bar door opens onto Second Avenue at the night walk spawn, facing east', () => {
  const g = night()
  const s = spawnAt('secondAve')
  assert.equal(g.space, 'downtown')
  assert.equal(g.story.scene, 'p_letter')
  assert.deepEqual(g.pos, vec(s.x, s.z))
  assert.equal(g.facing, yawOf(s.facing))
  assert.equal(g.panel, undefined)
})

test('the night walk runs the town map route through the collision to the boarding house door, which leads up to the room', () => {
  const g = night()
  const door = walk(g, legs[0]!.route)
  assert.equal(focus(door)?.id, 'boardingHouse')
  const room = interact(door)
  assert.equal(room.space, 'room')
  assert.equal(room.story.scene, 'p_letter')
  assert.deepEqual(room.path, g.path)
})

test('the morning walk runs from the boarding house past the post box and over First to the float, where the dock menu opens', () => {
  const room = walkLeg(night())
  const morning = press(interact(walk(room, [[1.6, -0.8]])), 'note:sleep')
  const s = spawnAt('boardingHouse')
  assert.deepEqual(morning.pos, vec(s.x, s.z))
  assert.equal(morning.space, 'downtown')
  assert.deepEqual(available(morning).map((i) => i.id).sort(), ['floatDock', 'landOffice'])
  const atBox = walk(morning, legs[1]!.route.slice(0, 3))
  assert.ok(distance(atBox.pos, spawnAt('postBox')) < 1)
  const dock = walkLeg(morning)
  assert.equal(dock.story.scene, 'p_dock')
  assert.deepEqual(dock.panel?.buttons.map((b) => b.id), ['note:fly'])
})

test('on the night walk only the boarding house door and the locked land office answer; the Silver Pan has closed behind Owen', () => {
  assert.deepEqual(available(night()).map((i) => i.id).sort(), ['boardingHouse', 'landOffice'])
})

test('the land office is locked: trying it sends nothing and Owen steps back to the street', () => {
  const office = doors.find((d) => d.id === 'landOffice')!
  const g = { ...night(), pos: vec(office.at.x, office.at.z + 0.3), facing: Math.PI, view: Math.PI }
  assert.equal(focus(g)?.id, 'landOffice')
  const tried = interact(g)
  assert.equal(tried.panel?.kind, 'locked')
  assert.equal(tried.panel?.title, 'The land office')
  assert.deepEqual(tried.story, g.story)
  assert.deepEqual(tried.path, g.path)
  const back = press(tried, 'close')
  assert.equal(back.panel, undefined)
  assert.equal(back.space, 'downtown')
})

test('the Silver Pan door leads into the bar while the story is there', () => {
  const story = replay([]).at(-1)!
  assert.equal(place(story), 'silverPan')
  const door = doors.find((d) => d.id === 'silverPan')!
  const g: Game = { ...press(start(), 'close'), space: 'downtown', pos: vec(door.at.x, door.at.z + 0.3), facing: Math.PI, view: Math.PI }
  assert.equal(focus(g)?.id, 'silverPan')
  const inside = interact(g)
  assert.equal(inside.space, 'bar')
  assert.deepEqual(inside.pos, spaces.bar.spawn)
})

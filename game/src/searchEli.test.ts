import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SceneId, State } from '../../text-game/src/types.ts'
import { replay } from '../../text-game/src/engine.ts'
import { initialState } from '../../text-game/src/state.ts'
import { sceneIndex } from '../../text-game/src/sceneIds.ts'
import { LINE_SPAWN, LINE_Z, PORCH_AT, SERGEANT_AT, STOPS, WOMAN_AT, line, onStreet, searchSpot } from './searchEli.ts'
import { distance } from './world.ts'

const at = (scene: SceneId): State => ({ ...initialState, scene })

const SEARCH: readonly SceneId[] = ['a1_flood', 'a1_track', 'a1_track_2', 'a1_couple', 'a1_eli', 'a1_errand', 'a1_trail', 'a1_delivered', 'a1_line', 'a1_body']

// The text build's paths through the search: `node src/cli.ts --choices <path>`.
const OPENING = [1, 1, 1, 1, 1, 1]
const COUPLE = [...OPENING, 1, 1, 1]
const ELI_AT_THIRD = [...COUPLE, 2]
const DELIVERED_FROM_THIRD = [...ELI_AT_THIRD, 1]
const LINE_FROM_THIRD = [...DELIVERED_FROM_THIRD, 1]
const TRAIL = [...COUPLE, 1, 1]
const DELIVERED_FROM_FIFTH = [...TRAIL, 1]

const last = (path: readonly number[]): State => replay(path).at(-1)!

test('the paths reach the scenes they are named for', () => {
  assert.equal(last(OPENING).scene, 'a1_flood')
  assert.equal(last(ELI_AT_THIRD).scene, 'a1_eli')
  assert.equal(last(DELIVERED_FROM_THIRD).scene, 'a1_delivered')
  assert.equal(last(TRAIL).scene, 'a1_trail')
  assert.equal(last(DELIVERED_FROM_FIFTH).scene, 'a1_delivered')
})

test('the woman from Minto stands from the flood until the line, then is gone', () => {
  SEARCH.forEach((s) => {
    const want = sceneIndex(s) >= sceneIndex('a1_flood') && sceneIndex(s) < sceneIndex('a1_line')
    assert.equal(onStreet('woman', at(s)), want, s)
  })
})

test('a townsperson arrives with their scene and stays until the search ends', () => {
  const arrives: readonly (readonly [string, SceneId])[] = [
    ['mattressMan', 'a1_track'],
    ['oldMan', 'a1_couple'],
    ['oldWoman', 'a1_couple'],
    ['boy', 'a1_trail'],
  ]
  arrives.forEach(([who, from]) =>
    SEARCH.forEach((s) => {
      const want = sceneIndex(s) >= sceneIndex(from) && sceneIndex(s) < sceneIndex('a1_body')
      assert.equal(onStreet(who, at(s)), want, `${who} at ${s}`)
    }),
  )
})

test('no one is on the street before the flood or after the search', () => {
  ;['woman', 'mattressMan', 'oldMan', 'boy', 'eliThird', 'eliFifth'].forEach((who) => {
    assert.equal(onStreet(who, at('a1_body')), false, who)
    assert.equal(onStreet(who, initialState), false, `${who} at the start`)
  })
})

test('an unknown figure is never placed', () => {
  SEARCH.forEach((s) => assert.equal(onStreet('nobody', at(s)), false, s))
})

test("Eli's boat is where the scene found it, and stays through the scene right after", () => {
  assert.equal(onStreet('eliThird', last(ELI_AT_THIRD), ELI_AT_THIRD), true)
  assert.equal(onStreet('eliFifth', last(ELI_AT_THIRD), ELI_AT_THIRD), false)
  assert.equal(onStreet('eliThird', last(DELIVERED_FROM_THIRD), DELIVERED_FROM_THIRD), true, 'the message, at Third')
  assert.equal(onStreet('eliThird', last(LINE_FROM_THIRD), LINE_FROM_THIRD), false, 'gone by the line')
  assert.equal(onStreet('eliFifth', last(TRAIL), TRAIL), true)
  assert.equal(onStreet('eliFifth', last(DELIVERED_FROM_FIFTH), DELIVERED_FROM_FIFTH), true, 'the message, at Fifth')
  assert.equal(onStreet('eliThird', last(DELIVERED_FROM_FIFTH), DELIVERED_FROM_FIFTH), false)
})

test('without a path, the boat only shows in its own scene', () => {
  assert.equal(onStreet('eliThird', at('a1_eli')), true)
  assert.equal(onStreet('eliThird', at('a1_delivered')), false)
  assert.equal(onStreet('eliFifth', at('a1_trail')), true)
})

test('each search scene opens at most one stop, and each stop is a spot in the space', () => {
  const ids = new Set(line.spots.map((s) => s.id))
  Object.entries(STOPS).forEach(([scene, stop]) => {
    assert.ok(ids.has(stop), `${scene} -> ${stop}`)
    const live = line.spots.filter((s) => searchSpot(at(scene as SceneId), s.id)).map((s) => s.id)
    assert.deepEqual(live, [stop], scene)
  })
  assert.deepEqual(line.spots.filter((s) => searchSpot(at('a1_delivered'), s.id)), [], 'the message opens where Wade stands')
})

test('the way up to the tent is live only while the story is at the help tent', () => {
  assert.equal(searchSpot(last([...COUPLE, 1]), 'tent'), true, 'the errand')
  assert.equal(searchSpot(at('a1_flood'), 'tent'), false)
  assert.equal(searchSpot(last(TRAIL), 'tent'), false)
})

test('the line: Wade spawns at the bags, with the woman beside him and the sergeant behind', () => {
  assert.deepEqual(line.spawn, LINE_SPAWN)
  assert.ok(Math.abs(LINE_SPAWN.z - LINE_Z) < 2)
  assert.ok(distance(LINE_SPAWN, WOMAN_AT) < 1.9, 'within her reach')
  assert.ok(SERGEANT_AT.z > LINE_Z, 'behind the line')
  assert.ok(PORCH_AT.z > LINE_Z, 'the porch is south of the line')
  const ids = line.figures.map((f) => f.id)
  assert.equal(new Set(ids).size, ids.length, 'figure ids are unique')
  ;['woman', 'sergeant', 'eliThird', 'eliFifth', 'boy'].forEach((id) => assert.ok(ids.includes(id), id))
  line.spots.forEach((s) => assert.ok(s.r > 0 && (s.prompt ?? '').length > 0, s.id))
})

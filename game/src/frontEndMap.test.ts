import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { goal, menu, place, send } from '../../text-game/src/story.ts'
import { SEEN_WITHIN, ahead, placeNames, pocketMap, seenAt, spots, visited } from './frontEndMap.ts'
import { start } from './prologue.ts'
import { startFrom } from './start.ts'
import { titleScene } from './frontEnd.ts'
import { vec } from './world.ts'

const known = (m: ReturnType<typeof pocketMap>): readonly string[] => m.spots.filter((s) => s.known).map((s) => s.id)

test('a new game knows only the Silver Pan, where the player is', () => {
  const m = pocketMap(start(), [])
  assert.deepEqual(known(m), ['silverPan'])
  assert.deepEqual(
    m.spots.filter((s) => s.here).map((s) => s.id),
    ['silverPan'],
  )
  assert.equal(m.you, undefined, 'inside the bar there is no street position')
  assert.equal(m.goal, goal(initialState))
})

test('every place the map knows comes from place(state) along the path, or a building walked past', () => {
  const g = startFrom('#path=1,1,1,1,1,1', '')
  const been = visited(g.path)
  const m = pocketMap(g, [])
  const fromStory = spots.filter((s) => s.places.some((p) => been.includes(p) || ahead(g.story).includes(p)))
  known(m).forEach((id) => assert.ok(fromStory.some((s) => s.id === id) || m.spots.find((s) => s.id === id)?.here, id))
  assert.ok(known(m).includes('boardingHouse'), "the prologue went through Owen's room")
  assert.ok(known(m).includes('floatDock'), 'and the float dock')
  assert.ok(!known(m).includes('nordale'), 'the Nordale was never passed')
  assert.ok(known(pocketMap(g, ['nordale'])).includes('nordale'))
})

test('visited lists each place of the scenes played, the current one included, once', () => {
  assert.deepEqual(visited([]), [place(initialState)])
  const path = [1, 1, 1, 1, 1, 1]
  const states = path.reduce((acc, n) => [...acc, send(acc.at(-1)!, menu(acc.at(-1)!).options.find((o) => o.n === n)!.note)], [initialState])
  assert.deepEqual(visited(path), [...new Set(states.flatMap((s) => place(s) ?? []))])
})

test('where to go is the place the current menu leads to, marked on the map', () => {
  const g = startFrom('#path=1,1', '')
  const next = ahead(g.story)
  assert.ok(next.length > 0)
  const m = pocketMap(g, [])
  next.forEach((p) => {
    const s = m.spots.find((x) => spots.find((y) => y.id === x.id)?.places.includes(p))
    if (s) assert.ok(s.next && s.known, p)
    else assert.ok(m.margin.some((x) => x.name === placeNames[p] && x.next), p)
  })
})

test('places off the walkable map go in the margin by name', () => {
  const g = startFrom('#path=1,1,1,1', '')
  const m = pocketMap(g, [])
  assert.ok(m.margin.some((x) => x.name === placeNames.surveyCamp))
})

test('downtown the player is a point and a heading, and buildings passed close go on the map', () => {
  const g = titleScene()
  const m = pocketMap(g, [])
  assert.deepEqual(m.you, { at: g.pos, facing: g.facing })
  const nordale = spots.find((s) => s.id === 'nordale')!
  const near = { ...g, pos: vec(nordale.door.x, nordale.door.z - SEEN_WITHIN + 1) }
  assert.ok(seenAt([], near).includes('nordale'))
  const far = { ...g, pos: vec(nordale.door.x, nordale.door.z - SEEN_WITHIN - 1) }
  assert.ok(!seenAt([], far).includes('nordale'))
  const seen = seenAt([], near)
  assert.equal(seenAt(seen, near), seen, 'nothing new keeps the same list')
  assert.deepEqual(seenAt([], start()), [], 'only downtown counts')
})

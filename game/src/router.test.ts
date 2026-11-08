import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { place } from '../../text-game/src/story.ts'
import { route, spaceFor } from './router.ts'
import { spaces } from './levels.ts'

test('each space answers to the place the story names for it', () => {
  Object.values(spaces).forEach((s) => assert.equal(spaceFor(s.place), s.id))
})

test('a place the engine has no space for, or no place at all, routes to the menu', () => {
  assert.equal(spaceFor('floatDock'), undefined)
  assert.equal(spaceFor(undefined), undefined)
  const dock = replay([1, 1, 1]).at(-1)!
  assert.equal(place(dock), 'floatDock')
  assert.deepEqual(route(dock), { to: 'menu' })
  const flood = replay([1, 1, 1, 1, 1, 1]).at(-1)!
  assert.equal(place(flood), undefined)
  assert.deepEqual(route(flood), { to: 'menu' })
})

test('a place with a space routes into it', () => {
  assert.deepEqual(route(replay([1, 1, 1, 1]).at(-1)!), { to: 'space', space: 'camp' })
  assert.deepEqual(route(replay([1, 1, 1, 1, 1]).at(-1)!), { to: 'space', space: 'flood' })
})

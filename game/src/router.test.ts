import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place } from '../../text-game/src/story.ts'
import { route, spaceFor } from './router.ts'
import { spaces } from './levels.ts'

const best: readonly number[] = (
  JSON.parse(readFileSync(new URL('../../text-game/routes/golden.json', import.meta.url), 'utf8')) as readonly { ending: string; path: string }[]
)
  .find((r) => r.ending === 'best')!
  .path.split(',')
  .map(Number)

test('each space answers to the act and place the story names for it', () => {
  Object.values(spaces).forEach((s) => assert.equal(spaceFor(s.act, s.place), s.id))
})

test('a place the engine has no space for, or no place at all, routes to the menu', () => {
  assert.equal(spaceFor('Prologue', 'floatDock'), undefined)
  assert.equal(spaceFor('Prologue', undefined), undefined)
  const dock = replay([1, 1, 1]).at(-1)!
  assert.equal(place(dock), 'floatDock')
  assert.deepEqual(route(dock), { to: 'menu' })
  const flood = replay([1, 1, 1, 1, 1, 1]).at(-1)!
  assert.equal(flood.scene, 'a1_flood')
  assert.deepEqual(route(flood), { to: 'menu' })
})

test('a place with a space routes into it', () => {
  assert.deepEqual(route(replay([1, 1, 1, 1]).at(-1)!), { to: 'space', space: 'camp' })
  assert.deepEqual(route(replay([1, 1, 1, 1, 1]).at(-1)!), { to: 'space', space: 'flood' })
})

test('a later act at a prologue place shows its menu, not the prologue space', () => {
  const later = replay(best).filter((s) => menu(s).act !== 'Prologue' && Object.values(spaces).some((sp) => sp.place === place(s)))
  assert.ok(later.length > 0, 'the best route revisits a prologue place')
  later.forEach((s) => assert.deepEqual(route(s), { to: 'menu' }, s.scene))
})

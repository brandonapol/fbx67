import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../state.ts'
import { replay } from '../engine.ts'
import type { State } from '../types.ts'
import type { Spent } from './select.ts'
import { here, pool, present, say, spentKey, topics } from './select.ts'
import { airman, bartender, fixture, jukebox } from './fixture.ts'

const atBar = initialState
const afterRound = replay([3]).at(-1)!
const inRoom = replay([1, 1]).at(-1)!

const ids = (bits: readonly { id: string }[]) => bits.map((b) => b.id)

const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object') Object.values(o).forEach(deepFreeze)
  return Object.freeze(o)
}

test('people are present only at their place and hour', () => {
  assert.equal(afterRound.scene, 'p_talk_round')
  assert.deepEqual(present(atBar, fixture).map((a) => a.id), ['bartender', 'jukebox', 'airman'])
  assert.equal(inRoom.scene, 'p_letter')
  assert.deepEqual(present(inRoom, fixture), [])
  assert.equal(here({ ...atBar, scene: 'a1_flood' }, bartender), false, 'a scene without a place or clock has nobody')
})

test('a trigger selects its own pool, gated by story state', () => {
  assert.deepEqual(ids(pool(atBar, bartender, 'greet')), ['nod', 'towel'])
  assert.deepEqual(ids(pool(afterRound, bartender, 'greet')), ['nod', 'towel', 'round'])
  assert.deepEqual(ids(pool(atBar, bartender, 'talk')), ['sun'])
  assert.deepEqual(ids(pool(atBar, jukebox, 'use')), ['dime'])
  assert.deepEqual(ids(pool(atBar, airman, 'bark')), ['again'])
  assert.deepEqual(pool(atBar, bartender, 'bark'), [])
  assert.deepEqual(pool(inRoom, bartender, 'greet'), [], 'nobody speaks where they are not')
})

test('ask about offers only the topics someone has a line for', () => {
  assert.deepEqual(topics(atBar, bartender), ['weather'])
  assert.deepEqual(topics(atBar, jukebox), [])
})

test('no line repeats until its pool is spent, then the rotation starts over', () => {
  const run = (s: State, n: number): readonly string[] => {
    const go = (spent: Spent, left: number, out: readonly string[]): readonly string[] => {
      const next = say(s, bartender, 'greet', spent)
      return left === 0 || !next ? out : go(next.spent, left - 1, [...out, next.bit.id])
    }
    return go({}, n, [])
  }
  assert.deepEqual(run(afterRound, 7), ['nod', 'towel', 'round', 'nod', 'towel', 'round', 'nod'])
  assert.deepEqual(run(atBar, 4), ['nod', 'towel', 'nod', 'towel'])
})

test('rotation is kept per speaker and trigger', () => {
  const a = say(atBar, bartender, 'greet', {})!
  const b = say(atBar, bartender, 'talk', a.spent)!
  assert.deepEqual(b.spent, { [spentKey(bartender, 'greet')]: ['nod'], [spentKey(bartender, 'talk')]: ['sun'] })
  assert.equal(say(atBar, airman, 'greet', b.spent), undefined, 'an empty pool says nothing')
})

test('a line gated out after it was said does not block the rest of its pool', () => {
  const spent: Spent = { [spentKey(bartender, 'greet')]: ['nod', 'round'] }
  assert.equal(say(atBar, bartender, 'greet', spent)?.bit.id, 'towel')
})

test('ambient talk leaves State unchanged', () => {
  const states = [atBar, afterRound, inRoom].map((s) => deepFreeze(structuredClone(s)))
  const before = structuredClone(states)
  states.forEach((s) => {
    fixture.forEach((a) => {
      present(s, fixture)
      topics(s, a)
      for (const t of ['greet', 'talk', 'bark', 'use', 'askAbout:weather'] as const) {
        pool(s, a, t)
        say(s, a, t, {})
      }
    })
  })
  assert.deepEqual(states, before)
})

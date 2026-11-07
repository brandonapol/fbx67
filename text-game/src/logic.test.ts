import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState } from './state.ts'
import { replay } from './engine.ts'
import { HEAT_LIMIT, curlyFate, doubleAgentWorks, eliJailed, ending, iceJam } from './logic.ts'
import type { State } from './types.ts'

const base: State = {
  ...initialState,
  scene: 'end',
  evidence: ['coFiles', 'tapes'],
  curlyPlan: 'warn',
  eliTrespass: 'quiet',
  afterConfession: 'stay',
  offer: 'refuse',
  testified: true,
  sharedWreck: true,
  heat: 0,
}

const w = (patch: Partial<State>): State => ({ ...base, ...patch })

test('best requires every gate', () => {
  assert.equal(ending(base), 'best')
  assert.equal(ending(w({ offer: 'fake' })), 'best')
})

test('each missing best gate drops to good or middle, never best', () => {
  const variants: readonly Partial<State>[] = [
    { curlyPlan: 'confront' },
    { curlyPlan: 'ignore' },
    { sharedWreck: false },
    { heat: HEAT_LIMIT + 1 },
  ]
  variants.forEach((v) => assert.equal(ending(w(v)), 'good', JSON.stringify(v)))
})

test('not testifying is middle', () => {
  assert.equal(ending(w({ testified: false })), 'middle')
})

test('walking away after the confession is middle', () => {
  assert.equal(ending(w({ afterConfession: 'walk' })), 'middle')
})

test('taking the offer or turning on Lucy is bad', () => {
  assert.equal(ending(w({ offer: 'take', testified: false })), 'bad')
  assert.equal(ending(w({ afterConfession: 'turn' })), 'bad')
})

test('double agent collapses to bad unless honest with friends', () => {
  assert.equal(doubleAgentWorks(w({ offer: 'fake' })), true)
  assert.equal(ending(w({ offer: 'fake', eliTrespass: 'report' })), 'bad')
  assert.equal(ending(w({ offer: 'fake', afterConfession: 'walk' })), 'bad')
})

test('ice jam is stopped only when honest with friends', () => {
  assert.equal(iceJam(base), 'stopped')
  assert.equal(iceJam(w({ eliTrespass: 'leverage' })), 'blown')
  assert.equal(iceJam(w({ afterConfession: 'walk' })), 'blown')
})

test('Eli is jailed if his trespass is used or the offer is taken', () => {
  assert.equal(eliJailed(base), false)
  assert.equal(eliJailed(w({ eliTrespass: 'report' })), true)
  assert.equal(eliJailed(w({ eliTrespass: 'leverage' })), true)
  assert.equal(eliJailed(w({ offer: 'take' })), true)
})

test('Curly fate follows the route', () => {
  assert.equal(curlyFate(base), 'testifies')
  assert.equal(curlyFate(w({ sharedWreck: false })), 'burglaryOnly')
  assert.equal(curlyFate(w({ offer: 'take' })), 'buried')
})

test('golden routes still reach their recorded endings', () => {
  const golden: ReadonlyArray<{ path: string; ending: string }> = JSON.parse(
    readFileSync(new URL('../routes/golden.json', import.meta.url), 'utf8'),
  )
  golden.forEach((g) => {
    const states = replay(g.path.split(',').map(Number))
    assert.equal(ending(states[states.length - 1]), g.ending, g.path)
  })
})

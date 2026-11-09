import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import {
  HEAT_LIMIT,
  curlyFate,
  doubleAgentWorks,
  eliJailed,
  ending,
  hankRemembers,
  iceJam,
  middleFlavor,
  missingForBest,
  momVerdict,
  paperRouteComplete,
} from './logic.ts'
import type { State } from './types.ts'

const base: State = {
  ...initialState,
  scene: 'end',
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

test('each missing best gate drops to good, never best', () => {
  const variants: readonly Partial<State>[] = [
    { curlyPlan: 'confront' },
    { curlyPlan: 'ignore' },
    { sharedWreck: false },
    { heat: HEAT_LIMIT + 1 },
    { leakedFlightDate: true },
  ]
  variants.forEach((v) => assert.equal(ending(w(v)), 'good', JSON.stringify(v)))
})

test('good drops to middle without testifying or after walking away', () => {
  const goods: readonly Partial<State>[] = [{ curlyPlan: 'confront' }, { sharedWreck: false }, { heat: HEAT_LIMIT + 1 }, { leakedFlightDate: true }]
  goods.forEach((g) => {
    assert.equal(ending(w(g)), 'good', JSON.stringify(g))
    assert.equal(ending(w({ ...g, testified: false })), 'middle', JSON.stringify(g))
    assert.equal(ending(w({ ...g, afterConfession: 'walk' })), 'middle', JSON.stringify(g))
  })
})

test('the paper route does not depend on evidence that is always obtained', () => {
  assert.equal(paperRouteComplete(w({ evidence: [] })), true)
  assert.equal(paperRouteComplete(w({ evidence: ['coFiles', 'tapes'] })), true)
  assert.equal(paperRouteComplete(w({ testified: false })), false)
  assert.equal(paperRouteComplete(w({ afterConfession: 'walk' })), false)
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
  assert.equal(iceJam(w({ offer: 'take' })), 'blown')
})

test('Eli is jailed if his trespass is used or the offer is taken', () => {
  assert.equal(eliJailed(base), false)
  assert.equal(eliJailed(w({ eliTrespass: 'report' })), true)
  assert.equal(eliJailed(w({ eliTrespass: 'leverage' })), true)
  assert.equal(eliJailed(w({ offer: 'take' })), true)
})

test('Curly fate follows the route for every ending', () => {
  const routes: readonly (readonly [Partial<State>, string, string])[] = [
    [{}, 'best', 'testifies'],
    [{ sharedWreck: false }, 'good', 'convicted'],
    [{ curlyPlan: 'confront' }, 'good', 'convicted'],
    [{ testified: false }, 'middle', 'convicted'],
    [{ afterConfession: 'walk' }, 'middle', 'convicted'],
    [{ offer: 'take' }, 'bad', 'buried'],
    [{ afterConfession: 'turn' }, 'bad', 'buried'],
    [{ offer: 'fake', eliTrespass: 'report' }, 'bad', 'buried'],
  ]
  routes.forEach(([patch, e, fate]) => {
    assert.equal(ending(w(patch)), e, JSON.stringify(patch))
    assert.equal(curlyFate(w(patch)), fate, JSON.stringify(patch))
    assert.equal(curlyFate(w({ ...patch, curlyPlan: 'ignore' })), 'killed', JSON.stringify(patch))
  })
})

test('middle flavor: burning beats walking, walking beats silence', () => {
  assert.equal(middleFlavor(w({ rashPlan: 'burn', afterConfession: 'walk' })), 'burn')
  assert.equal(middleFlavor(w({ rashPlan: 'burn' })), 'burn')
  assert.equal(middleFlavor(w({ rashPlan: 'safe', afterConfession: 'walk' })), 'walked')
  assert.equal(middleFlavor(w({ rashPlan: 'gunpoint', testified: false })), 'silent')
  assert.equal(middleFlavor(w({ rashPlan: 'none' })), 'silent')
})

test('Mom verdict tiers on honesty', () => {
  const expected: readonly (readonly [number, string])[] = [
    [3, 'knows'],
    [2, 'knows'],
    [1, 'halfKnows'],
    [0, 'halfKnows'],
    [-1, 'halfKnows'],
    [-2, 'believesALie'],
    [-3, 'believesALie'],
  ]
  expected.forEach(([h, v]) => assert.equal(momVerdict(w({ momHonesty: h })), v, String(h)))
})

test('missingForBest is empty for best and names each missing gate', () => {
  assert.deepEqual(missingForBest(base), [])
  assert.deepEqual(missingForBest(w({ curlyPlan: 'confront' })), ['decision 3 was not "warn Lucy"'])
  assert.deepEqual(missingForBest(w({ testified: false })), ['decision 7 did not testify'])
  assert.deepEqual(missingForBest(w({ sharedWreck: false })), ['wreck evidence not shared with Jake'])
  assert.deepEqual(missingForBest(w({ heat: HEAT_LIMIT + 1 })), [`heat ${HEAT_LIMIT + 1} above ${HEAT_LIMIT}`])
  assert.deepEqual(missingForBest(w({ leakedFlightDate: true })), ['told Mama the flight date'])
  assert.deepEqual(missingForBest(w({ eliTrespass: 'report' })), ['decision 4 was not "keep quiet"'])
  assert.deepEqual(missingForBest(w({ afterConfession: 'walk' })), ['decision 5 was not "stay"'])
  assert.deepEqual(missingForBest(w({ offer: 'take' })), ['ending is bad', 'decision 6 was not refuse or fake'])
  assert.deepEqual(missingForBest(w({ afterConfession: 'turn' })), ['ending is bad', 'decision 5 was not "stay"'])
})

test('every best gate missing at once is reported in order', () => {
  const worst = w({ curlyPlan: 'ignore', eliTrespass: 'report', afterConfession: 'turn', offer: 'take', testified: false, sharedWreck: false, heat: 6, leakedFlightDate: true })
  assert.equal(missingForBest(worst).length, 9)
  assert.equal(missingForBest(worst)[0], 'ending is bad')
})

test('Hank remembers the barfight move, or that Wade stayed on his stool', () => {
  assert.equal(hankRemembers(initialState), 'seat')
  assert.equal(hankRemembers({ ...initialState, barfightMove: 'shove' }), 'shove')
  assert.equal(hankRemembers({ ...initialState, barfightMove: 'mooseRack' }), 'mooseRack')
  assert.equal(hankRemembers({ ...initialState, barfightMove: 'bottle' }), 'bottle')
})

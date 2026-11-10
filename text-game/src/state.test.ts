import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOUNDS, addEvidence, eliTrust, heat, initialState, joan, lefty, lucyHeat, mom, pipe, recordsLog, texan } from './state.ts'
import type { Bounded } from './state.ts'
import type { State } from './types.ts'

const repeat = (f: (s: State) => State, times: number): ((s: State) => State) => pipe(...Array.from({ length: times }, () => f))

const helpers: Readonly<Record<Bounded, (n: number) => (s: State) => State>> = {
  heat,
  eliTrust,
  joan,
  lucyHeat,
  recordsLog,
  momHonesty: (n) => repeat(mom(n > 0 ? 'honest' : 'lie'), Math.abs(n)),
}

const bounded: readonly Bounded[] = ['heat', 'eliTrust', 'joan', 'momHonesty', 'lucyHeat', 'recordsLog']

test('the bounded list covers BOUNDS', () => {
  assert.deepEqual([...bounded].sort(), Object.keys(BOUNDS).sort())
})

test('every bounded counter clamps at both ends', () => {
  bounded.forEach((key) => {
    const [lo, hi] = BOUNDS[key]
    assert.equal(helpers[key](50)(initialState)[key], hi, `${key} upper`)
    assert.equal(helpers[key](-50)(initialState)[key], lo, `${key} lower`)
  })
})

test('the initial state is inside every bound', () => {
  bounded.forEach((key) => {
    const [lo, hi] = BOUNDS[key]
    assert.ok(initialState[key] >= lo && initialState[key] <= hi, key)
  })
})

test('soft lines leave honesty unchanged', () => {
  assert.equal(mom('soft')(initialState).momHonesty, 0)
})

test('evidence is deduplicated and sorted', () => {
  const s = pipe(addEvidence('tapes'), addEvidence('knot'), addEvidence('tapes'))(initialState)
  assert.deepEqual(s.evidence, ['knot', 'tapes'])
})

test('lefty needs both the bow and the bruising', () => {
  assert.equal(lefty(initialState), false)
  assert.equal(lefty(addEvidence('curlyLefty')(initialState)), false)
  assert.equal(lefty(addEvidence('bruising')(initialState)), false)
  assert.equal(lefty(pipe(addEvidence('curlyLefty'), addEvidence('bruising'))(initialState)), true)
})

test('texan needs both knots', () => {
  assert.equal(texan(initialState), false)
  assert.equal(texan(addEvidence('knot')(initialState)), false)
  assert.equal(texan(addEvidence('curlyKnot')(initialState)), false)
  assert.equal(texan(pipe(addEvidence('knot'), addEvidence('curlyKnot'))(initialState)), true)
})

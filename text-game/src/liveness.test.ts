import { test } from 'node:test'
import assert from 'node:assert/strict'
import { choicesOf, follow, render } from './engine.ts'
import { initialState } from './state.ts'
import { isPast, rules } from './liveness.ts'
import { mulberry, pickIndex } from './random.ts'
import type { State } from './types.ts'

const key = (s: State): string =>
  JSON.stringify(Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))))

const walk = (seed: number): readonly State[] => {
  const rnd = mulberry(seed)
  const go = (s: State, acc: readonly State[]): readonly State[] => {
    const cs = choicesOf(s)
    return cs.length === 0 ? acc : ((n) => go(n, [...acc, n]))(follow(s, cs, pickIndex(rnd, cs.length)))
  }
  return go(initialState, [initialState])
}

const states = Array.from({ length: 400 }, (_, i) => walk(i + 1)).flat()

test('every rule commutes with every later step: the field is never read or written again', () => {
  rules.forEach((r, ri) => {
    states
      .filter((s) => isPast(s, r))
      .forEach((s) => {
        const t = r.apply(s)
        assert.equal(render(t), render(s), `rule ${ri} changes the text at ${s.scene}`)
        const cs = choicesOf(s)
        const ct = choicesOf(t)
        assert.equal(ct.length, cs.length, `rule ${ri} changes the menu at ${s.scene}`)
        cs.forEach((_, i) => assert.equal(key(follow(t, ct, i + 1)), key(r.apply(follow(s, cs, i + 1))), `rule ${ri} at ${s.scene} choice ${i + 1}`))
      })
  })
})

test('every rule fires somewhere and is idempotent', () => {
  rules.forEach((r, ri) => {
    const past = states.filter((s) => isPast(s, r))
    assert.ok(past.length > 0, `rule ${ri} never fires`)
    past.forEach((s) => assert.equal(key(r.apply(r.apply(s))), key(r.apply(s)), `rule ${ri}`))
  })
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { choose, replay } from './engine.ts'
import { menu, offers, send, weather } from './story.ts'
import type { State } from './types.ts'

const talks = ['texas', 'munitions', 'round'] as const
const spots = ['stove', 'cache', 'marker'] as const

test('menu shows the scene text and one note per option', () => {
  const m = menu(initialState)
  assert.equal(m.scene, 'p_bar')
  assert.deepEqual(
    m.options.map((o) => o.note),
    [...talks],
  )
  assert.ok(m.text.includes('Silver Pan'))
})

test('send agrees with choose on every prologue route', () => {
  talks.forEach((talk, ti) =>
    spots.forEach((spot, si) => {
      const byNote = ['goodnight', spot, 'continue'].reduce(send, send(initialState, talk))
      const byNumber = replay([ti + 1, 1, si + 1, 1]).at(-1)
      assert.deepEqual(byNote, byNumber)
      assert.equal(byNote.scene, 'a1_flood')
      assert.equal(byNote.owenCache, spot)
    }),
  )
})

test('every option in the prologue has a named note', () => {
  const states = [initialState, choose(initialState, 1), replay([1, 1]).at(-1)!, replay([1, 1, 1]).at(-1)!]
  states.forEach((s) => menu(s).options.forEach((o) => assert.doesNotMatch(o.note, /^option\d+$/)))
})

test('send refuses a note the menu does not offer', () => {
  assert.equal(offers(initialState, 'stove'), false)
  assert.throws(() => send(initialState, 'stove'), /does not accept note stove/)
})

test('weather follows heat and trust', () => {
  const at = (patch: Partial<State>): State => ({ ...initialState, ...patch })
  assert.equal(weather(initialState), 'clear')
  assert.equal(weather(at({ heat: 2 })), 'dusk')
  assert.equal(weather(at({ eliTrust: -1 })), 'dusk')
  assert.equal(weather(at({ heat: 4 })), 'night')
  assert.equal(weather(at({ eliTrust: -3 })), 'night')
})

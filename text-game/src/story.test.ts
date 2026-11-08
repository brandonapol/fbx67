import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { replay } from './engine.ts'
import { clock, goal, menu, offers, place, send, weather } from './story.ts'
import { scenes } from './scenes/index.ts'
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
      const byNote = ['goodnight', 'sleep', 'fly', spot, 'continue'].reduce(send, send(initialState, talk))
      const byNumber = replay([ti + 1, 1, 1, 1, si + 1, 1]).at(-1)
      assert.deepEqual(byNote, byNumber)
      assert.equal(byNote.scene, 'a1_flood')
      assert.equal(byNote.owenCache, spot)
    }),
  )
})

test('every option in the prologue has a named note', () => {
  const states = replay([1, 1, 1, 1, 1])
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

test('every prologue scene says where, when and what next', () => {
  const prologue = scenes.filter((sc) => sc.act === 'Prologue')
  assert.ok(prologue.length > 0)
  prologue.forEach((sc) => {
    assert.ok(sc.place, `${sc.id} has no place`)
    assert.match(sc.clock ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `${sc.id} has no clock`)
    assert.ok(sc.goal, `${sc.id} has no goal`)
  })
})

test('the prologue clock only runs forward', () => {
  const times = scenes.filter((sc) => sc.act === 'Prologue').map((sc) => sc.clock ?? '')
  times.slice(1).forEach((t, i) => assert.ok(t >= times[i], `${t} comes before ${times[i]}`))
})

test('place, clock and goal read the current scene', () => {
  const dock = replay([1, 1, 1]).at(-1)!
  assert.equal(place(initialState), 'silverPan')
  assert.equal(clock(initialState), '1967-07-14T23:00')
  assert.equal(place(dock), 'floatDock')
  assert.equal(goal(dock), 'Fly north with Curly to the survey camp.')
  assert.equal(place(send(dock, 'fly')), 'surveyCamp')
  const flood = replay([1, 1, 1, 1, 1, 1]).at(-1)!
  assert.equal(flood.scene, 'a1_flood')
  assert.equal(place(flood), undefined)
  assert.equal(clock(flood), undefined)
  assert.equal(goal(flood), undefined)
})

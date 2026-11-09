import { test } from 'node:test'
import assert from 'node:assert/strict'
import { backwardClock, clockOverlaps } from './clock.ts'
import { scenes } from './scenes/index.ts'
import { initialState } from './state.ts'
import type { Scene } from './types.ts'

const fixture = (id: Scene['id'], clock?: Scene['clock']): Scene => ({
  id,
  act: 'Prologue',
  title: id,
  clock,
  text: () => '',
  choices: () => [],
})

test('a deliberately backward clock names both scene ids and both clocks', () => {
  const problem = backwardClock(fixture('p_dock', '1967-07-15T09:00'), fixture('p_camp', '1967-07-14T23:00'))
  assert.equal(problem, 'clock runs backward: p_dock (1967-07-15T09:00) -> p_camp (1967-07-14T23:00)')
})

test('a forward or equal clock passes', () => {
  assert.equal(backwardClock(fixture('p_dock', '1967-07-15T09:00'), fixture('p_camp', '1967-07-15T09:00')), null)
  assert.equal(backwardClock(fixture('p_dock', '1967-07-15T09:00'), fixture('p_camp', '1967-07-16T06:00')), null)
})

test('an edge with a missing clock on either side is not checked', () => {
  assert.equal(backwardClock(fixture('p_dock'), fixture('p_camp', '1967-07-14T23:00')), null)
  assert.equal(backwardClock(fixture('p_dock', '1967-07-15T09:00'), fixture('p_camp')), null)
})

test('the Act 3 POV switch from Lucy\'s night to Wade\'s search may overlap in time', () => {
  const night = fixture('a3_survive_fire', '1968-01-12T20:00')
  const search = fixture('a3_search', '1968-01-12T08:00')
  assert.equal(backwardClock(night, search), null)
  assert.match(backwardClock(fixture('a3_search', '1968-01-12T20:00'), fixture('a3_ski_down', '1968-01-12T08:00')) ?? '', /a3_search/)
})

test('every whitelisted overlap is a real edge between real scenes', () => {
  const byId = new Map(scenes.map((sc) => [sc.id, sc]))
  clockOverlaps.forEach(([from, to]) => {
    const sc = byId.get(from)
    assert.ok(sc, `${from} is not a scene`)
    assert.ok(byId.has(to), `${to} is not a scene`)
    const nexts = sc.choices(initialState).map((c) => c.next)
    assert.ok(nexts.includes(to), `${from} has no choice leading to ${to}`)
  })
})

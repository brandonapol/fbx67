import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { choicesOf } from './engine.ts'
import { menu, pov, send } from './story.ts'
import type { State } from './types.ts'

// #102: Eli's trip to Minto (a2_minto). Wade hears about it afterward, from Eli if Eli trusts him, else from Lucy.
const at = (patch: Partial<State> = {}): State => ({ ...initialState, scene: 'a2_minto', ...patch })

test('both ways out of the airstrip pass through Minto before Lucy\'s search or the day she is let go', () => {
  const curly: State = { ...initialState, scene: 'a2_curly' }
  assert.equal(send(curly, 'excuse').scene, 'a2_minto')
  assert.equal(send(send(curly, 'steak'), 'continue').scene, 'a2_minto')
  assert.equal(send(at(), 'leave').scene, 'a2_records')
  assert.equal(send(at({ lucyHeat: 2 }), 'leave').scene, 'a2_let_go')
})

test('Eli tells the trip himself when he trusts Wade, and Lucy tells it when he does not', () => {
  const trusted = menu(at({ eliTrust: 1 })).text
  const not = menu(at({ eliTrust: 0 })).text
  assert.match(trusted, /Eli tells it himself/)
  assert.match(trusted, /my grandfather's father/)
  assert.doesNotMatch(trusted, /Lucy tells it/)
  assert.match(not, /Lucy tells it/)
  assert.match(not, /our grandfather's father/)
  assert.match(not, /hasn't said a word to you/)
})

test('the trip is the same whoever tells it, and Wade is not there', () => {
  for (const eliTrust of [-3, 0, 1, 5]) {
    const text = menu(at({ eliTrust })).text
    assert.match(text, /Nobody told you he was going/)
    assert.match(text, /"Eleven,"/)
    assert.equal(pov(at({ eliTrust })), 'wade')
  }
})

test('the Minto scene moves no gate: leaving changes only the scene', () => {
  const s = at({ eliTrust: 2, heat: 3, evidence: ['knot'] })
  assert.equal(choicesOf(s).length, 1)
  assert.deepEqual({ ...send(s, 'leave'), scene: s.scene }, s)
})

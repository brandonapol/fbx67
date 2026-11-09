import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState } from '../state.ts'
import { lintAmbient } from './lint.ts'
import { prologueThings } from './prologueThings.ts'
import { pool } from './select.ts'

const source = readFileSync(new URL('./prologueThings.ts', import.meta.url), 'utf8')

test('the ambient lint passes over the prologue things', () => {
  assert.deepEqual(lintAmbient(prologueThings, [], source), [])
})

test('every prologue thing is used, not talked to, and is there in the scene it belongs to', () => {
  for (const t of prologueThings) {
    assert.equal(t.kind, 'thing')
    assert.deepEqual(Object.keys(t.lines), ['use'], t.id)
  }
  const at = (scene: string, id: string) => pool({ ...initialState, scene: scene as typeof initialState.scene }, prologueThings.find((t) => t.id === id)!, 'use')
  assert.ok(at('p_bar', 'jukebox').length > 1)
  assert.ok(at('p_talk_round', 'chair').length > 1)
  assert.ok(at('p_letter', 'reelToReel').length > 1)
  assert.deepEqual(at('p_letter', 'jukebox'), [], 'the jukebox stays in the bar')
})

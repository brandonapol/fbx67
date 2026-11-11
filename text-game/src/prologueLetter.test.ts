import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render, replay } from './engine.ts'
import { lettersTogether } from './logic.ts'
import { canonical } from './liveness.ts'
import { menu, send } from './story.ts'

// Owen's first letter to Lucy on the morning walk (#412): the walk down to the float dock ends with one note, the
// letter posted in the box on Cushman (`fly`) or still in his jacket (`keep`). Both fly north.

const dock = replay([1, 1, 1]).at(-1)!

test('the dock offers both ways the walk down ended, and both fly north', () => {
  assert.equal(dock.scene, 'p_dock')
  assert.deepEqual(menu(dock).options.map((o) => o.note), ['fly', 'keep'])
  assert.equal(send(dock, 'fly').scene, 'p_camp')
  assert.equal(send(dock, 'keep').scene, 'p_camp')
  assert.equal(send(dock, 'fly').owenLetter, 'mailed')
  assert.equal(send(dock, 'keep').owenLetter, 'kept')
})

test('the dock scene does not say the letter is mailed before the note says so', () => {
  assert.doesNotMatch(render(dock), /drop the letter in the slot/)
  assert.match(render(dock), /mailbox at the curb outside the Federal Building/)
})

test('a kept letter goes in the mail with the second one when Owen is back in town', () => {
  const kept = replay([1, 1, 1, 2, 1]).at(-1)!
  const mailed = replay([1, 1, 1, 1, 1]).at(-1)!
  assert.equal(kept.scene, 'p_end')
  assert.equal(lettersTogether(kept), true)
  assert.equal(lettersTogether(mailed), false)
  assert.match(render(kept), /with the first one/)
  assert.doesNotMatch(render(mailed), /with the first one/)
})

test('the letter is forgotten once the prologue is over', () => {
  const kept = replay([1, 1, 1, 2, 1, 1]).at(-1)!
  const mailed = replay([1, 1, 1, 1, 1, 1]).at(-1)!
  assert.equal(kept.scene, 'a1_flood')
  assert.deepEqual(canonical(kept), canonical(mailed))
})

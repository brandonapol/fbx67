import { test } from 'node:test'
import assert from 'node:assert/strict'
import { available, interact, press, start } from './prologue.ts'
import { talk, walk } from './drive.ts'

test('the door only opens after a conversation, and Hank only sells the round before one', () => {
  const g = press(start(), 'close')
  assert.deepEqual(available(g).map((i) => i.id).sort(), ['curly', 'hank', 'wade'])
  const after = talk(start(), 'texas')
  assert.deepEqual(available(after).map((i) => i.id).sort(), ['curly', 'door', 'wade'])
})

test('the door sends goodnight and shows the letter', () => {
  const g = interact(walk(talk(start(), 'texas'), [[0, 4.2]]))
  assert.equal(g.story.scene, 'p_letter')
  assert.deepEqual(g.path, [1, 1])
  assert.equal(g.panel?.title, 'Owen: A Letter to Lucy')
})

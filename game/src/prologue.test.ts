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

test('the letter is read in the room and no hiding note is sent there', () => {
  const room = interact(walk(talk(start(), 'munitions'), [[0, 4.2]]))
  const desk = interact(walk(room, [[1.6, -0.8]]))
  assert.equal(desk.panel?.title, 'Owen: A Letter to Lucy')
  assert.deepEqual(desk.panel?.buttons.map((b) => b.id), ['close'])
  assert.equal(desk.story.owenCache, undefined)
})

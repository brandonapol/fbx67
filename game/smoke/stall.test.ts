import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stallMessage } from './stall.ts'

test('a stall names the step, the wait, the state, the screen and the focus', () => {
  const m = stallMessage({ what: 'use hank', seconds: 120, at: '["a"]', screen: 'pause', focus: 'button "Resume"' })
  assert.equal(m, 'use hank: nothing changed in 120 s at ["a"] (screen: pause, focus: button "Resume")')
})

test('a stall with no screen or focus says so', () => {
  const m = stallMessage({ what: 'use hank', seconds: 120, at: 'x' })
  assert.match(m, /screen: unknown, focus: none\)$/)
})

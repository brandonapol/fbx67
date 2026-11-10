import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaults } from './input.ts'
import { FIGHT_PAD, fightHelp, intent, restart } from './fightControls.ts'

const b = defaults.bindings
const none = new Set<string>()
const pad = (buttons: readonly number[], axes: readonly number[] = [0, 0, 0, 0]) => ({
  id: 'Xbox Wireless Controller',
  axes,
  buttons: Array.from({ length: 16 }, (_, i) => buttons.includes(i)),
})

test('keyboard: walking is the game\'s bindings, up the screen is north; a verb fires on the frame its key goes down', () => {
  const i = intent(b, new Set(['KeyW', 'ShiftLeft', 'KeyF']), new Set(['KeyF']), undefined, [])
  assert.deepEqual(i.move, { x: 0, z: -1 })
  assert.ok(i.run && i.shove && !i.grab && !i.use)
  assert.ok(!intent(b, new Set(['KeyF']), none, undefined, []).shove)
  assert.ok(intent(b, none, new Set(['KeyE']), undefined, []).grab)
  assert.ok(intent(b, none, new Set(['KeyR']), undefined, []).use)
})

test('gamepad: the left stick walks, X shoves, A grabs, B uses, RB runs, each on the press only', () => {
  const i = intent(b, none, none, pad([FIGHT_PAD.shove, FIGHT_PAD.run], [1, 0, 0, 0]), [])
  assert.ok(i.move.x > 0.9 && i.shove && i.run)
  const held = pad([FIGHT_PAD.shove])
  assert.ok(!intent(b, none, none, held, held.buttons).shove)
  assert.ok(intent(b, none, none, pad([FIGHT_PAD.grab]), []).grab)
  assert.ok(intent(b, none, none, pad([FIGHT_PAD.use]), []).use)
})

test('restart: Backspace or the pad\'s menu button', () => {
  assert.ok(restart(new Set(['Backspace']), undefined, []))
  assert.ok(restart(none, pad([FIGHT_PAD.restart]), []))
  assert.ok(!restart(none, pad([]), []))
})

test('the help names the keys or the buttons for the device in hand', () => {
  assert.match(fightHelp('keyboard', b), /F shove, E grab/)
  assert.match(fightHelp('xbox', b), /X shove, A grab/)
  assert.match(fightHelp('playstation', b), /□ shove, ✕ grab/)
})

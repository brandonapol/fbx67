import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  defaults,
  deadzone,
  glyph,
  keyLabel,
  keyStick,
  look,
  padKind,
  padLook,
  padMove,
  parseControls,
  pressedNow,
  rebind,
  runLatch,
  serialize,
  touchStick,
} from './input.ts'

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9

test('saved controls round-trip, and junk falls back to the defaults', () => {
  const c = rebind({ ...defaults, invertY: true, sensitivity: 2 }, 'interact', 'KeyF')
  assert.deepEqual(parseControls(serialize(c)), c)
  assert.deepEqual(parseControls(null), defaults)
  assert.deepEqual(parseControls('not json'), defaults)
  assert.deepEqual(parseControls('{"bindings":{"forward":[]},"sensitivity":99,"invertY":"yes"}'), { ...defaults, sensitivity: 3 })
})

test('rebinding takes the key from other actions and never leaves one unbound', () => {
  const c = rebind(defaults, 'forward', 'KeyI')
  assert.deepEqual(c.bindings.forward, ['KeyI', 'ArrowUp'])
  const stolen = rebind(defaults, 'interact', 'KeyW')
  assert.deepEqual(stolen.bindings.interact, ['KeyW', 'Space'])
  assert.deepEqual(stolen.bindings.forward, ['ArrowUp'])
  const single = rebind(rebind(defaults, 'run', 'KeyR'), 'run', 'KeyR')
  assert.deepEqual(single.bindings.run, ['KeyR', 'ShiftRight'])
  const swap = rebind({ ...defaults, bindings: { ...defaults.bindings, run: ['KeyQ'], interact: ['KeyE'] } }, 'interact', 'KeyQ')
  assert.deepEqual(swap.bindings.interact, ['KeyQ'])
  assert.deepEqual(swap.bindings.run, ['KeyE'])
})

test('keys map to a stick that is never longer than one', () => {
  const s = keyStick(new Set(['KeyW', 'KeyD']), defaults.bindings)
  assert.ok(near(Math.hypot(s.x, s.y), 1) && s.x > 0 && s.y > 0)
  assert.deepEqual(keyStick(new Set(['KeyW', 'KeyS']), defaults.bindings), { x: 0, y: 0 })
  const back = keyStick(new Set(['ArrowDown']), rebind(defaults, 'back', 'KeyK').bindings)
  assert.deepEqual(back, { x: 0, y: -1 })
})

test('the deadzone drops drift and rescales the rest', () => {
  assert.deepEqual(deadzone({ x: 0.1, y: 0.1 }), { x: 0, y: 0 })
  const full = deadzone({ x: 0, y: 1 })
  assert.ok(near(full.y, 1))
  const half = deadzone({ x: 0, y: 0.6 })
  assert.ok(near(half.y, 0.5))
})

test('a gamepad moves with the left stick and looks with the right', () => {
  const pad = { id: 'Xbox Wireless Controller', axes: [0, -1, 0.6, 0], buttons: [] }
  assert.ok(near(padMove(pad).y, 1))
  assert.ok(near(padLook(pad).x, 0.5))
  assert.equal(padKind(pad.id), 'xbox')
  assert.equal(padKind('054c-0ce6-DualSense Wireless Controller'), 'playstation')
  assert.ok(pressedNow([false], [true], 0))
  assert.ok(!pressedNow([true], [true], 0))
})

test('a stick press latches run until the stick comes back to center', () => {
  const on = runLatch(false, true, 1)
  assert.ok(on)
  assert.ok(runLatch(on, false, 0.8))
  assert.ok(!runLatch(on, false, 0))
  assert.ok(!runLatch(on, true, 1))
})

test('look respects sensitivity and invert-Y', () => {
  const base = look(10, 10, defaults, 0.01)
  assert.ok(base.yaw < 0 && base.pitch > 0)
  const inverted = look(10, 10, { ...defaults, invertY: true, sensitivity: 2 }, 0.01)
  assert.ok(near(inverted.pitch, -2 * base.pitch) && near(inverted.yaw, 2 * base.yaw))
})

test('the touch stick clamps to its ring and points forward when dragged up', () => {
  const s = touchStick({ x: 100, y: 100 }, { x: 100, y: -500 })
  assert.ok(near(s.y, 1) && near(s.x, 0))
  assert.deepEqual(touchStick({ x: 100, y: 100 }, { x: 103, y: 102 }), { x: 0, y: 0 })
})

test('glyphs follow the device and the binding', () => {
  assert.equal(glyph('keyboard', defaults), 'E')
  assert.equal(glyph('keyboard', rebind(defaults, 'interact', 'Space')), 'Space')
  assert.equal(glyph('xbox', defaults), 'A')
  assert.equal(glyph('playstation', defaults), '✕')
  assert.equal(glyph('touch', defaults), undefined)
  assert.equal(keyLabel('ArrowUp'), '↑')
  assert.equal(keyLabel('Digit4'), '4')
})

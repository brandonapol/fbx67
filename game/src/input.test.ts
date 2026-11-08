import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  defaults,
  deadzone,
  glyph,
  help,
  keyLabel,
  keyLook,
  keyStick,
  look,
  padKind,
  padLook,
  padMove,
  parseControls,
  pressedNow,
  rebind,
  runLatch,
  safeStore,
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
  assert.ok(base.yaw < 0 && base.pitch < 0)
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

test('look keys turn and tilt the camera and stay clear of interact', () => {
  assert.deepEqual(keyLook(new Set(['KeyJ', 'KeyI']), defaults.bindings), { x: -1, y: -1 })
  const look = ['lookLeft', 'lookRight', 'lookUp', 'lookDown'] as const
  look.forEach((a) => assert.ok(!defaults.bindings[a].some((k) => defaults.bindings.interact.includes(k))))
  const moved = rebind(defaults, 'lookUp', 'KeyU')
  assert.deepEqual(keyLook(new Set(['KeyU']), moved.bindings), { x: 0, y: -1 })
})

test('help is written from the current bindings and the pad in hand', () => {
  const c = rebind(rebind(defaults, 'interact', 'KeyF'), 'run', 'KeyR')
  const text = help('keyboard', c)
  assert.match(text, /WASD to walk, R to run\. IJKL or click/)
  assert.match(text, /F to interact/)
  assert.match(help('xbox', c), /press it \(LS\) to run.*A to interact/)
  assert.match(help('playstation', c), /\(L3\).*\u2715 to interact/)
})

test('a store that throws reads as empty and refuses writes', () => {
  const broken = safeStore(() => {
    throw new Error('blocked')
  })
  assert.equal(broken.read('k'), null)
  assert.equal(broken.write('k', 'v'), false)
  assert.deepEqual(parseControls(broken.read('k')), defaults)
  const throwing = safeStore(() => ({
    getItem: () => {
      throw new Error('denied')
    },
    setItem: () => {
      throw new Error('quota')
    },
  }))
  assert.equal(throwing.read('k'), null)
  assert.equal(throwing.write('k', 'v'), false)
  const memory = new Map<string, string>()
  const ok = safeStore(() => ({ getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) }))
  assert.ok(ok.write('k', 'v'))
  assert.equal(ok.read('k'), 'v')
})

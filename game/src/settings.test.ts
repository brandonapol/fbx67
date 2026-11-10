import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Controls } from './input.ts'
import { SENSITIVITY, actions, defaults, keyLabel, rebind } from './input.ts'
import type { Prefs } from './frontEnd.ts'
import { defaultPrefs } from './frontEnd.ts'
import { mountPrefs, mountSettings } from './settings.ts'

// A stand-in DOM, just wide enough for the settings panel: elements by id, created rows and buttons, listeners, and
// a window that takes the panel's capturing keydown.

type Listener = (e: unknown) => void

type El = {
  id: string
  tag: string
  hidden: boolean
  checked: boolean
  value: string
  min: string
  max: string
  type: string
  className: string
  textContent: string
  dataset: Record<string, string>
  children: El[]
  addEventListener: (kind: string, f: Listener) => void
  fire: (kind: string, e?: unknown) => void
  append: (...els: El[]) => void
  replaceChildren: (...els: El[]) => void
}

const element = (tag = 'div'): El => {
  const listeners = new Map<string, Listener[]>()
  const el: El = {
    id: '',
    tag,
    hidden: false,
    checked: false,
    value: '',
    min: '',
    max: '',
    type: '',
    className: '',
    textContent: '',
    dataset: {},
    children: [],
    addEventListener: (kind, f) => void listeners.set(kind, [...(listeners.get(kind) ?? []), f]),
    fire: (kind, e = {}) => (listeners.get(kind) ?? []).forEach((f) => f(e)),
    append: (...els) => void el.children.push(...els),
    replaceChildren: (...els) => void (el.children = els),
  }
  return el
}

type Key = { code: string; prevented: boolean; stopped: boolean; preventDefault: () => void; stopImmediatePropagation: () => void }

const key = (code: string): Key => {
  const e: Key = {
    code,
    prevented: false,
    stopped: false,
    preventDefault: () => void (e.prevented = true),
    stopImmediatePropagation: () => void (e.stopped = true),
  }
  return e
}

const IDS = ['settings', 'settings-open', 'settings-close', 'settings-reset', 'invert-y', 'sensitivity', 'bindings', 'text-size', 'reduce-motion', 'sight-cone']

const dom = (locked = false) => {
  const els = new Map(IDS.map((id) => [id, Object.assign(element(), { id })]))
  els.get('settings')!.hidden = true
  const keydown: { f?: Listener; capture?: boolean } = {}
  const lock = { el: locked ? element() : null, exits: 0 }
  const g = globalThis as unknown as Record<string, unknown>
  g.document = {
    getElementById: (id: string) => els.get(id) ?? null,
    createElement: (tag: string) => element(tag),
    get pointerLockElement() {
      return lock.el
    },
    exitPointerLock: () => {
      lock.exits += 1
      lock.el = null
    },
  }
  g.window = {
    addEventListener: (kind: string, f: Listener, opts: { capture?: boolean }) => {
      if (kind === 'keydown') Object.assign(keydown, { f, capture: opts.capture })
    },
  }
  const el = (id: string): El => els.get(id)!
  const press = (code: string): Key => {
    const e = key(code)
    keydown.f!(e)
    return e
  }
  const buttons = (): El[] => el('bindings').children.map((row) => row.children[1]!)
  return { el, press, buttons, keydown, lock }
}

// Mounts the controls panel on a fresh DOM over a stored Controls, and records every set.
const mounted = (start: Controls = defaults, locked = false) => {
  const d = dom(locked)
  const store = { c: start, sets: [] as Controls[] }
  const s = mountSettings(
    () => store.c,
    (c) => {
      store.c = c
      store.sets.push(c)
    },
  )
  return { ...d, s, store }
}

test('the panel mounts closed, its slider spans the sensitivity bounds, and keys are captured', () => {
  const m = mounted()
  assert.equal(m.s.open(), false)
  assert.equal(m.el('sensitivity').min, String(SENSITIVITY.min))
  assert.equal(m.el('sensitivity').max, String(SENSITIVITY.max))
  assert.equal(m.keydown.capture, true)
  assert.equal(m.store.sets.length, 0, 'mounting changes nothing')
})

test('opening draws one row per action with its keys, and the current toggles', () => {
  const c: Controls = { ...defaults, invertY: true, sensitivity: 1.75 }
  const m = mounted(c)
  m.s.show(true)
  assert.equal(m.s.open(), true)
  assert.equal(m.el('invert-y').checked, true)
  assert.equal(m.el('sensitivity').value, '1.75')
  const bs = m.buttons()
  assert.equal(bs.length, actions.length)
  actions.forEach((a, i) => {
    assert.equal(bs[i]!.dataset.action, a)
    assert.equal(bs[i]!.textContent, c.bindings[a].map(keyLabel).join(' / '))
  })
  assert.equal(bs[0]!.textContent, `W / ${keyLabel('ArrowUp')}`)
})

test('opening releases the pointer lock so the panel can be clicked', () => {
  const m = mounted(defaults, true)
  m.s.show(true)
  assert.equal(m.lock.exits, 1)
  m.s.show(false)
  m.s.show(true)
  assert.equal(m.lock.exits, 1, 'nothing to release the second time')
})

test('the opener toggles the panel and Done closes it', () => {
  const m = mounted()
  m.el('settings-open').fire('click')
  assert.equal(m.s.open(), true)
  m.el('settings-open').fire('click')
  assert.equal(m.s.open(), false)
  m.s.show(true)
  m.el('settings-close').fire('click')
  assert.equal(m.s.open(), false)
})

test('invert and sensitivity save at once and keep the other settings', () => {
  const m = mounted()
  m.s.show(true)
  m.el('invert-y').checked = true
  m.el('invert-y').fire('change')
  assert.deepEqual(m.store.c, { ...defaults, invertY: true })
  m.el('sensitivity').value = '2.5'
  m.el('sensitivity').fire('input')
  assert.deepEqual(m.store.c, { ...defaults, invertY: true, sensitivity: 2.5 })
  assert.equal(m.store.sets.length, 2)
})

test('rebinding: click an action, it waits for a key, and the key is bound', () => {
  const m = mounted()
  m.s.show(true)
  const i = actions.indexOf('interact')
  m.buttons()[i]!.fire('click')
  assert.equal(m.buttons()[i]!.textContent, 'Press a key')
  const e = m.press('KeyF')
  assert.ok(e.prevented && e.stopped)
  assert.deepEqual(m.store.c, rebind(defaults, 'interact', 'KeyF'))
  assert.ok(m.buttons()[i]!.textContent.startsWith('F / '), 'redrawn with the new key first')
  assert.equal(m.s.open(), true, 'the panel stays open')
  m.press('KeyG')
  assert.equal(m.store.sets.length, 1, 'only one key is taken per click')
})

test('Escape cancels a rebind without closing; a second Escape closes', () => {
  const m = mounted()
  m.s.show(true)
  m.buttons()[0]!.fire('click')
  m.press('Escape')
  assert.equal(m.store.sets.length, 0)
  assert.equal(m.s.open(), true)
  assert.notEqual(m.buttons()[0]!.textContent, 'Press a key')
  const e = m.press('Escape')
  assert.equal(m.s.open(), false)
  assert.ok(e.stopped)
})

test('closing forgets a pending rebind', () => {
  const m = mounted()
  m.s.show(true)
  m.buttons()[0]!.fire('click')
  m.s.show(false)
  m.s.show(true)
  m.press('KeyZ')
  assert.equal(m.store.sets.length, 0)
})

test('with the panel closed, keys pass through to the game untouched', () => {
  const m = mounted()
  const e = m.press('KeyW')
  assert.equal(e.stopped, false)
  assert.equal(e.prevented, false)
  assert.equal(m.store.sets.length, 0)
})

test('Reset restores the default controls and redraws', () => {
  const m = mounted({ ...rebind(defaults, 'run', 'KeyQ'), invertY: true, sensitivity: 0.5 })
  m.s.show(true)
  m.el('settings-reset').fire('click')
  assert.deepEqual(m.store.c, defaults)
  assert.equal(m.el('invert-y').checked, false)
  assert.equal(m.el('sensitivity').value, String(defaults.sensitivity))
})

test('prefs draw what is stored and save each change through parsePrefs', () => {
  const d = dom()
  const store = { p: { text: 'large', motion: 'off', cone: true } as Prefs, sets: [] as Prefs[] }
  mountPrefs(
    () => store.p,
    (p) => {
      store.p = p
      store.sets.push(p)
    },
  )
  assert.equal(d.el('text-size').value, 'large')
  assert.equal(d.el('reduce-motion').value, 'off')
  assert.equal(d.el('sight-cone').checked, true)
  d.el('text-size').value = 'normal'
  d.el('text-size').fire('change')
  assert.deepEqual(store.p, { text: 'normal', motion: 'off', cone: true })
  d.el('reduce-motion').value = 'sideways'
  d.el('reduce-motion').fire('change')
  assert.equal(store.p.motion, defaultPrefs.motion, 'an unknown value falls back')
  d.el('sight-cone').checked = false
  d.el('sight-cone').fire('change')
  assert.equal(store.p.cone, false)
  assert.equal(store.sets.length, 3)
})

test('a missing element is a loud error, not a silent no-op', () => {
  dom()
  ;(globalThis as unknown as { document: { getElementById: (id: string) => null } }).document.getElementById = () => null
  assert.throws(() => mountSettings(() => defaults, () => undefined), /missing #settings/)
})

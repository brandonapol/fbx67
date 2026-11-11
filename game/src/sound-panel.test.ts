import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import type { Audio } from './audio.ts'
import type { Bus } from './mixer.ts'
import { BUSES, BUS_LABELS, DEFAULT_VOLUMES } from './mixer.ts'

// sound-panel.ts imports its stylesheet, which node cannot load; an empty module stands in for it.
registerHooks({
  load: (url, ctx, next) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : next(url, ctx)),
})

type Listener = (e: unknown) => void

class HTMLElementFake {
  tag = ''
  id = ''
  type = ''
  min = ''
  max = ''
  step = ''
  value = ''
  htmlFor = ''
  hidden = false
  textContent = ''
  dataset: Record<string, string> = {}
  attrs: Record<string, string> = {}
  children: HTMLElementFake[] = []
  parent?: HTMLElementFake
  listeners = new Map<string, Listener[]>()
  blurs = 0
  addEventListener(kind: string, f: Listener): void {
    this.listeners.set(kind, [...(this.listeners.get(kind) ?? []), f])
  }
  fire(kind: string, e: unknown = {}): void {
    ;(this.listeners.get(kind) ?? []).forEach((f) => f(e))
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v
  }
  append(...x: HTMLElementFake[]): void {
    x.forEach((c) => (c.parent = this))
    this.children.push(...x)
  }
  contains(o: HTMLElementFake): boolean {
    return o === this || this.children.some((c) => c.contains(o))
  }
  blur(): void {
    this.blurs += 1
    if (doc.activeElement === this) doc.activeElement = null
  }
}
class HTMLInputElementFake extends HTMLElementFake {}

const doc: { activeElement: HTMLElementFake | null; createElement: (tag: string) => HTMLElementFake; body: HTMLElementFake } = {
  activeElement: null,
  createElement: (tag) => Object.assign(tag === 'input' ? new HTMLInputElementFake() : new HTMLElementFake(), { tag }),
  body: new HTMLElementFake(),
}

const win = new HTMLElementFake()
const g = globalThis as unknown as Record<string, unknown>
g.document = doc
g.window = win
g.HTMLElement = HTMLElementFake
g.HTMLInputElement = HTMLInputElementFake

const { mountSoundPanel } = await import('./sound-panel.ts')

const fakeAudio = (volumes = DEFAULT_VOLUMES) => {
  const set: [Bus, number][] = []
  const audio = { volumes: () => volumes, setVolume: (b: Bus, v: number) => void set.push([b, v]) } as unknown as Audio
  return { audio, set }
}

const mount = (volumes = DEFAULT_VOLUMES) => {
  doc.activeElement = null
  const parent = new HTMLElementFake()
  win.listeners.clear()
  const a = fakeAudio(volumes)
  const root = mountSoundPanel(a.audio, parent as unknown as HTMLElement) as unknown as HTMLElementFake
  const [toggle, panel] = root.children as [HTMLElementFake, HTMLElementFake]
  const sliders = panel.children.filter((c) => c.tag === 'input')
  return { ...a, parent, root, toggle, panel, sliders }
}

test('it mounts closed on the given parent, with a toggle that says so', () => {
  const m = mount()
  assert.deepEqual(m.parent.children, [m.root])
  assert.equal(m.root.id, 'sound')
  assert.equal(m.panel.hidden, true)
  assert.equal(m.toggle.attrs['aria-expanded'], 'false')
  assert.equal(m.panel.attrs.role, 'group')
})

test('one labelled slider per bus, spanning 0 to 100 and showing the current volume', () => {
  const volumes = { ambience: 0.5, sfx: 0.255, voice: 0, music: 1 }
  const m = mount(volumes)
  assert.deepEqual(m.sliders.map((s) => s.dataset.bus), [...BUSES])
  m.sliders.forEach((s, i) => {
    const bus = BUSES[i]!
    assert.equal(s.type, 'range')
    assert.equal(s.min, '0')
    assert.equal(s.max, '100')
    assert.equal(s.id, `sound-${bus}`)
    const label = m.panel.children.find((c) => c.htmlFor === s.id)!
    assert.equal(label.textContent, BUS_LABELS[bus])
  })
  assert.deepEqual(m.sliders.map((s) => s.value), ['50', '26', '0', '100'])
})

test('moving a slider sets that bus to a fraction of one', () => {
  const m = mount()
  m.sliders[1]!.value = '35'
  m.sliders[1]!.fire('input')
  m.sliders[3]!.value = '0'
  m.sliders[3]!.fire('input')
  assert.deepEqual(m.set, [['sfx', 0.35], ['music', 0]])
})

test('the toggle opens and closes the panel, reports it, and gives focus back', () => {
  const m = mount()
  m.toggle.fire('click')
  assert.equal(m.panel.hidden, false)
  assert.equal(m.toggle.attrs['aria-expanded'], 'true')
  assert.equal(m.toggle.blurs, 1, 'so Space and Enter go to the game')
  m.toggle.fire('click')
  assert.equal(m.panel.hidden, true)
  assert.equal(m.toggle.attrs['aria-expanded'], 'false')
})

test('Escape closes an open panel and drops focus from inside it; other keys do not', () => {
  const m = mount()
  m.toggle.fire('click')
  m.sliders[0]!.parent = m.panel
  doc.activeElement = m.sliders[0]!
  win.fire('keydown', { key: 'Enter' })
  assert.equal(m.panel.hidden, false)
  win.fire('keydown', { key: 'Escape' })
  assert.equal(m.panel.hidden, true)
  assert.equal(m.sliders[0]!.blurs, 1)
  assert.equal(doc.activeElement, null)
  win.fire('keydown', { key: 'Escape' })
  assert.equal(m.panel.hidden, true, 'a second Escape leaves it closed')
})

test('arrow keys on a slider stay with the slider and never reach the game; others pass', () => {
  const m = mount()
  const slider = m.sliders[0]!
  const press = (target: unknown, key: string): boolean => {
    const e = { key, target, stopped: false, stopPropagation() { this.stopped = true } }
    m.root.fire('keydown', e)
    return e.stopped
  }
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) assert.equal(press(slider, k), true, k)
  assert.equal(press(slider, 'KeyW'), false)
  assert.equal(press(m.toggle, 'ArrowLeft'), false, 'only a slider holds the arrows')
})

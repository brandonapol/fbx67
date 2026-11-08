import './style.css'
import type { Game, Input } from './prologue.ts'
import { focus, interact, label, press, start, tick, textBuildHash, topSpeed } from './prologue.ts'
import { createView } from './render.ts'
import { createAudio } from './audio.ts'
import { mountSoundPanel } from './sound-panel.ts'
import { spaces } from './levels.ts'
import type { Rig } from './camera.ts'
import { armFor, bob, follow, rigFor, toWorld } from './camera.ts'
import type { Controls, Device, Pad, Stick } from './input.ts'
import {
  KEY_RATE,
  MOUSE_RATE,
  PAD,
  STICK_RATE,
  STORAGE_KEY,
  TOUCH_RATE,
  actionFor,
  glyph,
  held,
  help,
  keyLook,
  keyStick,
  look,
  padActive,
  padKind,
  padLook,
  padMove,
  parseControls,
  pressedNow,
  runLatch,
  safeStore,
  serialize,
  touchStick,
} from './input.ts'
import { mountSettings } from './settings.ts'
import type { Vec } from './world.ts'
import { distance, length, sub, vec } from './world.ts'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el as T
}

const canvas = $<HTMLCanvasElement>('scene')
const promptEl = $<HTMLButtonElement>('prompt')
const panelEl = $('panel')
const titleEl = $('panel-title')
const textEl = $('panel-text')
const buttonsEl = $('panel-buttons')
const placeEl = $('place')
const stickEl = $('stick')
const knobEl = $('stick-knob')
const helpEl = $('help')

placeEl.textContent = 'Loading…'
const view = await createView(canvas, import.meta.env.BASE_URL)

const store = safeStore(() => window.localStorage)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

type Drag = Readonly<{ id: number; origin: Stick; at: Stick }>

const live: {
  g: Game
  rig: Rig
  rigFor: string
  controls: Controls
  device: Device
  keys: Set<string>
  target?: Vec
  touchHold: boolean
  shown?: unknown
  promptKey?: string
  pad: readonly boolean[]
  run: boolean
  stick?: Drag
  orbit?: Drag & Readonly<{ moved: boolean }>
  turn: { x: number; y: number }
} = {
  g: start(),
  rig: rigFor(Math.PI, armFor(spaces.bar)),
  rigFor: '',
  controls: parseControls(store.read(STORAGE_KEY)),
  device: 'keyboard',
  keys: new Set(),
  touchHold: false,
  pad: [],
  run: false,
  turn: { x: 0, y: 0 },
}

const settings = mountSettings(
  () => live.controls,
  (c) => {
    live.controls = c
    live.promptKey = undefined
    store.write(STORAGE_KEY, serialize(c))
    renderHelp()
  },
)

const localStore = (): Storage | undefined => {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

const audio = createAudio(localStore())
mountSoundPanel(audio)
;['pointerdown', 'touchend', 'keydown'].forEach((type) => window.addEventListener(type, audio.unlock, { capture: true }))

const textBuild = (g: Game): string => new URL(`../${textBuildHash(g)}`, window.location.href).toString()

const act = (f: (g: Game) => Game): void => {
  live.g = f(live.g)
  live.target = undefined
}

const choose = (id: string): void => act((g) => press(g, id))

const renderHelp = (): void => {
  helpEl.textContent = help(live.device, live.controls)
}

const setDevice = (d: Device): void => {
  if (live.device === d) return
  live.device = d
  live.promptKey = undefined
  document.body.dataset.device = d
  renderHelp()
}

const renderPanel = (g: Game): void => {
  if (live.shown === g.panel) return
  live.shown = g.panel
  panelEl.hidden = !g.panel
  document.body.dataset.panel = g.panel ? 'open' : ''
  if (!g.panel) return
  if (document.pointerLockElement) document.exitPointerLock()
  panelEl.dataset.kind = g.panel.kind
  titleEl.textContent = g.panel.title
  textEl.replaceChildren(
    ...g.panel.text.split(/\n\s*\n/).map((para) => Object.assign(document.createElement('p'), { textContent: para.trim() })),
  )
  buttonsEl.replaceChildren(
    ...g.panel.buttons.map((b, i) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.dataset.id = b.id
      el.innerHTML = `<span class="key">${i + 1}</span>`
      el.append(b.label)
      el.addEventListener('click', () => choose(b.id))
      return el
    }),
  )
  buttonsEl.querySelector('button')?.focus({ preventScroll: true })
}

const RING = 2 * Math.PI * 15

const promptMarkup = (key: string | undefined, hold: boolean): string =>
  `<span class="glyph${hold ? ' hold' : ''}">` +
  (hold ? `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="track" cx="18" cy="18" r="15"/><circle class="fill" cx="18" cy="18" r="15" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg>` : '') +
  (key ? `<span class="key">${key}</span>` : '') +
  `</span><span class="label"></span>`

const placePrompt = (at: Readonly<{ x: number; y: number }> | undefined): void => {
  const w = promptEl.offsetWidth
  const h = promptEl.offsetHeight
  const x = at ? Math.max(16 + w / 2, Math.min(window.innerWidth - 16 - w / 2, at.x)) : window.innerWidth / 2
  const y = at ? Math.max(16 + h, Math.min(window.innerHeight - 16, at.y)) : window.innerHeight - 56
  promptEl.style.left = `${x}px`
  promptEl.style.top = `${y}px`
}

const renderHud = (g: Game): void => {
  const f = focus(g)
  promptEl.hidden = !f
  placeEl.textContent = spaces[g.space].name
  if (f) {
    const hold = f.hold !== undefined
    const key = glyph(live.device, live.controls)
    const text = label(g, f)
    const said = hold ? `Hold: ${text}` : text
    const id = `${f.id}|${key}|${said}`
    if (live.promptKey !== id) {
      live.promptKey = id
      promptEl.innerHTML = promptMarkup(key, hold)
      const l = promptEl.querySelector('.label')
      if (l) l.textContent = said
      promptEl.dataset.id = f.id
    }
    const fill = promptEl.querySelector<SVGCircleElement>('.fill')
    const k = g.holding && g.holding.id === f.id ? g.holding.progress / g.holding.time : 0
    fill?.setAttribute('stroke-dashoffset', String(RING * (1 - Math.min(1, k))))
    placePrompt(view.screenAt(f.x, 1.9, f.z))
  }
  renderPanel(g)
}

const readPad = (): Pad | undefined => {
  const p = Array.from(navigator.getGamepads?.() ?? []).find((x) => x && x.connected)
  return p ? { id: p.id, axes: Array.from(p.axes), buttons: p.buttons.map((b) => b.pressed) } : undefined
}

const panelFocus = (step: number): void => {
  const buttons = Array.from(buttonsEl.querySelectorAll('button'))
  if (!buttons.length) return
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
  buttons[(i + step + buttons.length) % buttons.length].focus({ preventScroll: true })
}

const confirmPanel = (): void => {
  const el = document.activeElement
  const b = el instanceof HTMLButtonElement && buttonsEl.contains(el) ? el : buttonsEl.querySelector('button')
  b?.click()
}

const padFrame = (pad: Pad | undefined): void => {
  const now = pad?.buttons ?? []
  const prev = live.pad
  live.pad = now
  if (!pad) return
  if (padActive(pad)) setDevice(padKind(pad.id))
  if (settings.open()) return
  if (live.g.panel) {
    if (pressedNow(prev, now, PAD.a)) confirmPanel()
    if (pressedNow(prev, now, PAD.down)) panelFocus(1)
    if (pressedNow(prev, now, PAD.up)) panelFocus(-1)
    return
  }
  if (pressedNow(prev, now, PAD.a)) act(interact)
}

const longest = (sticks: readonly Stick[]): Stick =>
  sticks.reduce((a, b) => (Math.hypot(b.x, b.y) > Math.hypot(a.x, a.y) ? b : a), { x: 0, y: 0 })

const input = (pad: Pad | undefined, dt: number): Readonly<{ input: Input; look: Readonly<{ yaw: number; pitch: number }> }> => {
  const c = live.controls
  const keys = settings.open() ? new Set<string>() : live.keys
  const padStick = pad ? padMove(pad) : { x: 0, y: 0 }
  const touch = live.stick ? touchStick(live.stick.origin, live.stick.at) : { x: 0, y: 0 }
  const stick = longest([keyStick(keys, c.bindings), padStick, touch])
  const push = Math.hypot(stick.x, stick.y)
  if (push > 0) live.target = undefined
  const towards = live.target && distance(live.target, live.g.pos) > 0.15 ? live.target : undefined
  live.target = towards
  const dir = push > 0 ? toWorld(stick, live.rig.yaw) : towards ? sub(towards, live.g.pos) : vec(0, 0)
  const padTurn = pad ? padLook(pad) : { x: 0, y: 0 }
  const mouse = look(live.turn.x, live.turn.y, c, MOUSE_RATE)
  const stickTurn = look(padTurn.x * dt, padTurn.y * dt, c, STICK_RATE)
  const turnKeys = keyLook(keys, c.bindings)
  const keyTurn = look(turnKeys.x * dt, turnKeys.y * dt, { ...c, invertY: false }, KEY_RATE)
  live.turn = { x: 0, y: 0 }
  return {
    input: {
      dir,
      hold: held(keys, c.bindings, 'interact') || live.touchHold || !!pad?.buttons[PAD.a],
      run: held(keys, c.bindings, 'run') || live.run,
      limit: towards ? distance(towards, live.g.pos) : undefined,
      view: live.rig.yaw,
    },
    look: { yaw: mouse.yaw + stickTurn.yaw + keyTurn.yaw, pitch: mouse.pitch + stickTurn.pitch + keyTurn.pitch },
  }
}

window.addEventListener('keydown', (e) => {
  setDevice('keyboard')
  if (e.repeat) return
  live.keys.add(e.code)
  const g = live.g
  if (g.panel) {
    const n = Number(e.key)
    const b = Number.isInteger(n) && n > 0 ? g.panel.buttons[n - 1] : e.code === 'Enter' ? g.panel.buttons[0] : undefined
    if (b) {
      e.preventDefault()
      choose(b.id)
    }
    return
  }
  if (actionFor(live.controls.bindings, e.code) === 'interact') {
    e.preventDefault()
    act(interact)
  }
})
window.addEventListener('keyup', (e) => live.keys.delete(e.code))
window.addEventListener('blur', () => live.keys.clear())

promptEl.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  live.touchHold = true
  act(interact)
})
const release = () => {
  live.touchHold = false
}
promptEl.addEventListener('pointerup', release)
promptEl.addEventListener('pointerleave', release)
promptEl.addEventListener('pointercancel', release)

const at = (e: PointerEvent): Stick => ({ x: e.clientX, y: e.clientY })

const capture = (e: PointerEvent): void => {
  try {
    canvas.setPointerCapture(e.pointerId)
  } catch {
    return
  }
}

const showStick = (d: Drag | undefined): void => {
  stickEl.hidden = !d
  if (!d) return
  const s = touchStick(d.origin, d.at)
  stickEl.style.left = `${d.origin.x}px`
  stickEl.style.top = `${d.origin.y}px`
  knobEl.style.transform = `translate(${s.x * 40}px, ${-s.y * 40}px)`
}

canvas.addEventListener('pointerdown', (e) => {
  if (live.g.panel || settings.open()) return
  if (e.pointerType === 'mouse') {
    setDevice('keyboard')
    if (document.pointerLockElement !== canvas) Promise.resolve(canvas.requestPointerLock()).catch(() => undefined)
    return
  }
  setDevice('touch')
  capture(e)
  if (e.clientX < window.innerWidth * 0.4 && !live.stick) {
    live.stick = { id: e.pointerId, origin: at(e), at: at(e) }
    showStick(live.stick)
    return
  }
  if (!live.orbit) live.orbit = { id: e.pointerId, origin: at(e), at: at(e), moved: false }
})

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement === canvas) live.turn = { x: live.turn.x + e.movementX, y: live.turn.y + e.movementY }
    return
  }
  if (live.stick?.id === e.pointerId) {
    live.stick = { ...live.stick, at: at(e) }
    showStick(live.stick)
  }
  const o = live.orbit
  if (o?.id === e.pointerId) {
    const dx = e.clientX - o.at.x
    const dy = e.clientY - o.at.y
    const moved = o.moved || Math.hypot(e.clientX - o.origin.x, e.clientY - o.origin.y) > 8
    const k = TOUCH_RATE / MOUSE_RATE
    if (moved) live.turn = { x: live.turn.x + dx * k, y: live.turn.y + dy * k }
    live.orbit = { ...o, at: at(e), moved }
  }
})

const lift = (e: PointerEvent): void => {
  if (live.stick?.id === e.pointerId) {
    live.stick = undefined
    showStick(undefined)
  }
  const o = live.orbit
  if (o?.id === e.pointerId) {
    live.orbit = undefined
    if (!o.moved && e.type === 'pointerup') {
      const r = canvas.getBoundingClientRect()
      const hit = view.groundAt(e.clientX - r.left, e.clientY - r.top)
      if (hit) live.target = vec(hit.x, hit.z)
    }
  }
}
canvas.addEventListener('pointerup', lift)
canvas.addEventListener('pointercancel', lift)

const placeRig = (g: Game): void => {
  const key = `${g.space}|${g.busts}`
  if (live.rigFor === key) return
  live.rigFor = key
  live.rig = rigFor(g.facing, live.rig.base)
}

renderHelp()

view.app.on('update', (dtRaw: number) => {
  const dt = Math.min(dtRaw, 0.1)
  const pad = readPad()
  const l3 = pad ? pressedNow(live.pad, pad.buttons, PAD.l3) : false
  const lean = pad ? padMove(pad) : { x: 0, y: 0 }
  live.run = runLatch(live.run, l3, Math.hypot(lean.x, lean.y))
  padFrame(pad)
  const frame = input(pad, dt)
  live.g = tick(live.g, frame.input, dt)
  placeRig(live.g)
  const g = live.g
  const sway = bob(g.t, length(g.vel), topSpeed(frame.input), reducedMotion.matches)
  const next = follow(live.rig, spaces[g.space], g.pos, g.facing, g.panel ? { yaw: 0, pitch: 0 } : frame.look, dt, sway)
  live.rig = next.rig
  view.sync(g, dt, next.pose)
  audio.sync(g, dt)
  renderHud(g)
})

Object.assign(window, {
  __prologue: {
    game: () => live.g,
    walkTo: (x: number, z: number) => {
      live.target = vec(x, z)
    },
    textBuild: () => textBuild(live.g),
    camera: () => live.rig,
    aim: (yaw: number, pitch: number) => {
      live.rig = { ...live.rig, yaw, pitch, idle: 0 }
    },
    audio: () => audio.status(),
  },
})

if (new URLSearchParams(window.location.search).get('test') === '1') {
  void import('./probe.ts').then(({ installProbe }) =>
    installProbe(view, {
      get: () => live.g,
      set: (g) => {
        live.g = g
        live.target = undefined
      },
    }),
  )
}

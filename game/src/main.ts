import './style.css'
import type { Game, Input } from './prologue.ts'
import { CIGARETTE, canLight, focus, footY, handedOff, heldBehind, interact, label, panelText, playerBody, press, start, tick, textBuildHash, topSpeed } from './prologue.ts'
import { fade } from './skiff.ts'
import { sweepFade } from './hazards.ts'
import { flightFade } from './flight.ts'
import { sleepCard, sleepFade } from './boardingHouseSleep.ts'
import { mapSheet, mapsPanel } from './room.ts'
import { startFrom } from './start.ts'
import type { Letter } from './letters.ts'
import { sheet } from './letters.ts'
import { renderLetter } from './letterView.ts'
import { createView } from './render.ts'
import { createAudio } from './audio.ts'
import { cover, overheard } from './hotelBar.ts'
import { mountSoundPanel } from './sound-panel.ts'
import { spaces } from './levels.ts'
import type { Placed, Rig } from './camera.ts'
import { armFor, bob, follow, place, rigFor, toWorld } from './camera.ts'
import { canRestart, checkpoint, restart } from './barfight.ts'
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
import { mountPrefs, mountSettings } from './settings.ts'
import { mountStealth } from './stealthView.ts'
import type { Log, Objective, Prefs, Screen } from './frontEnd.ts'
import {
  JOURNAL_KEY,
  PAD_BACK,
  PAD_START,
  PREFS_KEY,
  SAVE_KEY,
  TITLE_TURN,
  back,
  emptyLog,
  firstScreen,
  isCastFile,
  loadOrReport,
  journal,
  loadShare,
  metAt,
  objectiveFor,
  objectiveShown,
  parseLog,
  parsePrefs,
  recall,
  reduced,
  runs,
  saveLog,
  savePath,
  savedPath,
  talkHeard,
  titleScene,
} from './frontEnd.ts'
import type { FrontEndAction } from './frontEndView.ts'
import { mountFrontEnd } from './frontEndView.ts'
import { pocketMap, seenAt } from './frontEndMap.ts'
import { mountSigns } from './streetSignsView.ts'
import type { Talk, Visit } from './talk.ts'
import { showing } from './talk.ts'
import { ASK_PROMPT, TOWN_SEED, ask, asker, townsfolk } from './townsfolk.ts'
import type { Interactable, Vec } from './world.ts'
import { distance, length, sub, vec } from './world.ts'
import { fightHelp, intent as fightIntent } from './fightControls.ts'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el as T
}

const canvas = $<HTMLCanvasElement>('scene')
const promptEl = $<HTMLButtonElement>('prompt')
const fadeEl = $('fade')
const cardEl = $('card')
const panelEl = $('panel')
const titleEl = $('panel-title')
const textEl = $('panel-text')
const buttonsEl = $('panel-buttons')
const placeEl = $('place')
const stickEl = $('stick')
const knobEl = $('stick-knob')
const helpEl = $('help')
const subtitleEl = $('subtitle')

// The front end (frontEnd.ts): its handler is filled in below, once the game exists; until then the loading bar is up.
const onFront: { go: (a: FrontEndAction) => void } = { go: () => undefined }
const front = mountFrontEnd((a) => onFront.go(a))
const arrived = { n: 0 }
front.loading(0)
const watcher =
  typeof PerformanceObserver === 'undefined'
    ? undefined
    : new PerformanceObserver((list) => {
        arrived.n += list.getEntries().filter((e) => isCastFile(e.name)).length
        front.loading(loadShare(arrived.n))
      })
watcher?.observe({ type: 'resource', buffered: true })
const view = await loadOrReport(() => createView(canvas, import.meta.env.BASE_URL), front.failed)
const syncSigns = mountSigns(document.body)
watcher?.disconnect()
front.loading(undefined)
performance.mark('second-rush:loaded')

const store = safeStore(() => window.localStorage)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

type Drag = Readonly<{ id: number; origin: Stick; at: Stick }>

const firstShown = firstScreen(window.location.hash, window.location.search)
const first = firstShown === 'title' ? titleScene() : startFrom(window.location.hash, window.location.search)
const savedAt = (): string | undefined => savedPath(store.read(SAVE_KEY))

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
  shownText?: string
  promptKey?: string
  pad: readonly boolean[]
  run: boolean
  stick?: Drag
  orbit?: Drag & Readonly<{ moved: boolean }>
  turn: { x: number; y: number }
  // Game ticks per drawn frame: 1 in play. The smoke test raises it so software rendering's few frames a second
  // don't stretch its walks and the skiff ride into real minutes; each tick is still at most 0.1 s.
  pace: number
  // The front end: the screen up, the objective line, the journal's people and lines, and the player's settings.
  screen: Screen
  now: number
  objective?: Objective
  log: Log
  prefs: Prefs
  saved?: string
  began?: number
  interactive?: number
  shownAt: number
  // What the town has said to the player (talk.ts): asking the way puts a line here, shown over the speaker.
  talk: Talk
  shownLine?: string
  // Keys gone down since the last tick, for the barfight's verbs (fightControls.ts), and whether its help is up.
  pressed: Set<string>
  fighting: boolean
  // The game at the drunk's shove while the barfight is on: the pause menu restarts the fight from it (barfight.ts).
  shove?: Game
} = {
  g: first,
  rig: rigFor(first.facing, armFor(spaces[first.space])),
  rigFor: '',
  controls: parseControls(store.read(STORAGE_KEY)),
  device: 'keyboard',
  keys: new Set(),
  touchHold: false,
  pad: [],
  run: false,
  turn: { x: 0, y: 0 },
  pace: 1,
  screen: firstShown,
  now: 0,
  shownAt: 0,
  talk: { spent: {}, log: [] },
  pressed: new Set(),
  fighting: false,
  log: firstShown === 'play' ? parseLog(store.read(JOURNAL_KEY), savePath(first.path)) : emptyLog,
  prefs: parsePrefs(store.read(PREFS_KEY)),
}

const applyPrefs = (): void => {
  document.body.dataset.text = live.prefs.text
  view.cone(live.prefs.cone)
}
const syncStealth = mountStealth()
applyPrefs()
mountPrefs(
  () => live.prefs,
  (p) => {
    live.prefs = p
    store.write(PREFS_KEY, JSON.stringify(p))
    applyPrefs()
  },
)

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
const soundPanel = mountSoundPanel(audio).querySelector<HTMLElement>('#sound-panel')
// An Esc that closes the sound panel is spent on it: note before the panel's own handler runs that it was open.
const escClosing = { panel: false }
window.addEventListener(
  'keydown',
  (e) => {
    escClosing.panel = e.code === 'Escape' && soundPanel?.hidden === false
  },
  { capture: true },
)
;['pointerdown', 'touchend', 'keydown'].forEach((type) => window.addEventListener(type, audio.unlock, { capture: true }))

const textBuild = (g: Game): string => new URL(`../${textBuildHash(g)}`, window.location.href).toString()

// The game as talk.ts sees it: the town placed with the view's seed, its lines on the play clock.
const here = (): Visit => ({ game: live.g, talk: live.talk, clock: live.now, seed: TOWN_SEED })

// Interacting with the person in front of the player puts them in the journal; a passer-by on the street, asked, tells
// the way.
const interactNow = (): void => {
  const v = here()
  if (asker(v)) {
    live.talk = ask(v).talk
    return
  }
  live.log = metAt(live.log, live.g, focus(live.g)?.id)
  act(interact)
}

// Every change to the game goes through here or the tick, so the barfight's checkpoint follows it.
const moved = (g: Game): void => {
  live.shove = checkpoint(live.shove, live.g, g)
  live.g = g
}

const act = (f: (g: Game) => Game): void => {
  moved(f(live.g))
  live.target = undefined
  if (handedOff(live.g)) window.location.href = textBuild(live.g)
}

const forgetStart = (): void => {
  const u = new URL(window.location.href)
  u.hash = ''
  u.searchParams.delete('from')
  window.history.replaceState(null, '', u)
}

const choose = (id: string): void => {
  if (id === 'restart') forgetStart()
  act((g) => press(g, id))
}

const renderHelp = (): void => {
  helpEl.textContent = live.fighting ? fightHelp(live.device, live.controls.bindings) : help(live.device, live.controls)
}

const setDevice = (d: Device): void => {
  if (live.device === d) return
  live.device = d
  live.promptKey = undefined
  document.body.dataset.device = d
  renderHelp()
}

const renderText = (g: Game): void => {
  const text = g.panel === mapsPanel ? 'maps' : panelText(g)
  if (live.shownText === text) return
  live.shownText = text
  if (g.panel === mapsPanel) {
    textEl.innerHTML = mapSheet()
    return
  }
  textEl.replaceChildren(...text.split(/\n\s*\n/).map((para) => Object.assign(document.createElement('p'), { textContent: para.trim() })))
}

// A letter home: the letter view in the panel's text, redrawn as the pen moves.
const renderHome = (l: Letter): void => {
  const s = sheet(l)
  const key = JSON.stringify(s)
  if (live.shownText === key) return
  live.shownText = key
  renderLetter(textEl, s, (note) => choose(`note:${note}`))
}

const renderPanel = (g: Game): void => {
  if (g.panel) (g.home ? renderHome(g.home) : renderText(g))
  if (live.shown === g.panel) return
  live.shown = g.panel
  panelEl.hidden = !g.panel
  document.body.dataset.panel = g.panel ? 'open' : ''
  if (!g.panel) return
  if (g.panel.kind === 'talk') live.log = talkHeard(live.log, g.panel.title, g.panel.text)
  if (document.pointerLockElement) document.exitPointerLock()
  panelEl.dataset.kind = g.panel.kind
  titleEl.textContent = g.panel.title
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

// With nothing in front of him, Wade can hold interact to light a cigarette: the prompt sits low and centered.
const lighting = (g: Game): boolean => canLight(g) || g.holding?.id === CIGARETTE

const smoke = { id: CIGARETTE, hold: 1 } as const

// The line a townsperson is saying now, over their head; nothing once they are done or out of the space.
// In the hotel bar, what has come through from the booth so far, over the booth (hotelBar.ts).
const renderOverheard = (g: Game): boolean => {
  const heard = g.space === 'hotelBar' ? overheard(g.story, g.bar) : []
  const at = heard.length ? view.screenAt(heard.at(-1)!.at.x, 2.0, heard.at(-1)!.at.z) : undefined
  if (!at) return false
  const text = heard.map((h) => `"${h.text}"`).join('   ')
  if (live.shownLine !== text) {
    live.shownLine = text
    subtitleEl.dataset.who = 'booth'
    subtitleEl.textContent = text
  }
  subtitleEl.hidden = false
  subtitleEl.style.left = `${Math.max(16, Math.min(window.innerWidth - 16, at.x))}px`
  subtitleEl.style.top = `${Math.max(16, at.y)}px`
  return true
}

const renderSubtitle = (g: Game): void => {
  if (renderOverheard(g)) return
  const line = showing(live.talk, live.now).at(-1)
  const who = line && townsfolk(g).find((f) => f.id === line.who)
  const at = who && view.screenAt(who.at.x, 2.3, who.at.z)
  subtitleEl.hidden = !line || !at
  if (!line || !at) return
  const text = `${line.name}: ${line.text}`
  if (live.shownLine !== text) {
    live.shownLine = text
    subtitleEl.dataset.who = line.who
    subtitleEl.textContent = text
  }
  subtitleEl.style.left = `${Math.max(16, Math.min(window.innerWidth - 16, at.x))}px`
  subtitleEl.style.top = `${Math.max(16, at.y)}px`
}

const renderHud = (g: Game): void => {
  const target = focus(g)
  const passer = target ? undefined : asker(here())
  const f: Pick<Interactable, 'id' | 'hold'> | undefined = target ?? (passer ? { id: passer.id } : lighting(g) ? smoke : undefined)
  promptEl.hidden = !f
  placeEl.textContent = spaces[g.space].name
  if (f) {
    const hold = f.hold !== undefined
    const key = glyph(live.device, live.controls)
    const text = target ? label(g, target) : passer ? ASK_PROMPT : 'Light a cigarette'
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
    const over = target ?? passer
    placePrompt(over ? view.screenAt(over.x, 1.9, over.z) : undefined)
  }
  renderSubtitle(g)
  renderPanel(g)
  fadeEl.style.opacity = String(Math.max(fade(g.space === 'flood' ? g.ride : undefined), sweepFade(g.swept), flightFade(g.flight), sleepFade(g)))
  const card = sleepCard(g) ?? ''
  if (cardEl.textContent !== card) cardEl.textContent = card
}

const readPad = (): Pad | undefined => {
  const p = Array.from(navigator.getGamepads?.() ?? []).find((x) => x && x.connected)
  return p ? { id: p.id, axes: Array.from(p.axes), buttons: p.buttons.map((b) => b.pressed) } : undefined
}

const panelFocus = (step: number): void => {
  const buttons = Array.from(panelEl.querySelectorAll('button'))
  if (!buttons.length) return
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
  buttons[(i + step + buttons.length) % buttons.length].focus({ preventScroll: true })
}

const confirmPanel = (): void => {
  const el = document.activeElement
  // A letter's lines are picked, never defaulted: confirm clicks only the one in focus, and finishes a line being written.
  if (live.g.home?.writing) return choose('finish')
  const b = el instanceof HTMLButtonElement && panelEl.contains(el) ? el : live.g.home ? undefined : buttonsEl.querySelector('button')
  b?.click()
}

const padFrame = (pad: Pad | undefined): void => {
  const now = pad?.buttons ?? []
  const prev = live.pad
  live.pad = now
  if (!pad) return
  if (padActive(pad)) setDevice(padKind(pad.id))
  if (settings.open()) return
  const pick = (): void => (document.activeElement instanceof HTMLButtonElement ? document.activeElement : front.buttons()[0])?.click()
  if (pressedNow(prev, now, PAD_START)) return live.screen === 'title' ? pick() : go(runs(live.screen) ? 'pause' : 'resume')
  if (!runs(live.screen)) {
    if (pressedNow(prev, now, PAD.a)) pick()
    if (pressedNow(prev, now, PAD.down)) menuFocus(1)
    if (pressedNow(prev, now, PAD.up)) menuFocus(-1)
    if (pressedNow(prev, now, PAD.b)) go('back')
    return
  }
  if (pressedNow(prev, now, PAD_BACK)) showObjective()
  if (live.g.panel) {
    if (pressedNow(prev, now, PAD.a)) confirmPanel()
    if (pressedNow(prev, now, PAD.down)) panelFocus(1)
    if (pressedNow(prev, now, PAD.up)) panelFocus(-1)
    return
  }
  if (pressedNow(prev, now, PAD.a)) interactNow()
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
  live.pressed.add(e.code)
  if (!runs(live.screen)) {
    // The Esc that let go of the mouse already paused (pointerlockchange); it does not also resume.
    if (e.code === 'Escape' && performance.now() - live.shownAt > 250) go('back')
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      e.preventDefault()
      menuFocus(e.code === 'ArrowDown' ? 1 : -1)
    }
    return
  }
  const free = actionFor(live.controls.bindings, e.code) === undefined
  if (free && ((e.code === 'Escape' && !escClosing.panel) || e.code === 'KeyP')) {
    e.preventDefault()
    return go('pause')
  }
  if (free && e.code === 'KeyO') return showObjective()
  if (free && e.code === 'KeyM') return go('map')
  live.keys.add(e.code)
  const g = live.g
  if (g.home) {
    const n = Number(e.key)
    const b = Number.isInteger(n) && n > 0 ? sheet(g.home).buttons[n - 1] : undefined
    if (b || (g.home.writing && e.code === 'Enter')) {
      e.preventDefault()
      choose(b ? `note:${b.note}` : 'finish')
    }
    return
  }
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
    interactNow()
  }
})
window.addEventListener('keyup', (e) => live.keys.delete(e.code))
window.addEventListener('blur', () => live.keys.clear())

promptEl.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  live.touchHold = true
  interactNow()
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
  if (live.g.panel || settings.open() || !runs(live.screen)) return
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
  const { rig, key } = place({ rig: live.rig, key: live.rigFor }, g)
  live.rig = rig
  live.rigFor = key
}

renderHelp()

// --- The front end: which screen is up, and what each of its buttons does.

const menuFocus = (step: number): void => {
  const buttons = front.buttons()
  if (!buttons.length) return
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
  buttons[(i + step + buttons.length) % buttons.length].focus({ preventScroll: true })
}

const showObjective = (): void => {
  if (live.objective) live.objective = recall(live.objective, live.now)
}

const drawFront = (): void =>
  front.show(live.screen, {
    canContinue: savedAt() !== undefined,
    canRestart: canRestart(live.g, live.shove),
    goal: objectiveShown(live.objective ? recall(live.objective, live.now) : undefined, live.now),
    journal: live.screen === 'journal' ? journal(live.g, live.log) : undefined,
    map: live.screen === 'map' ? pocketMap(live.g, live.log.seen) : undefined,
  })

const begin = (g: Game, log: Log): void => {
  live.g = g
  live.shove = undefined
  live.log = log
  live.target = undefined
  live.objective = undefined
  live.saved = undefined
  live.rig = rigFor(g.facing, armFor(spaces[g.space]))
  live.rigFor = ''
  live.keys.clear()
  live.began = performance.now()
  live.interactive = undefined
}

const show = (screen: Screen): void => {
  if (screen !== live.screen) live.shownAt = performance.now()
  live.screen = screen
  live.keys.clear()
  if (!runs(screen) && document.pointerLockElement) document.exitPointerLock()
  drawFront()
}

const go = (a: FrontEndAction): void => {
  if (a === 'continue') {
    const path = savedAt()
    if (!path) return
    begin(startFrom(`#path=${path}`, ''), parseLog(store.read(JOURNAL_KEY), path))
    return show('play')
  }
  if (a === 'new') {
    forgetStart()
    begin(start(), emptyLog)
    return show('play')
  }
  if (a === 'title') {
    forgetStart()
    begin(titleScene(), emptyLog)
    return show('title')
  }
  if (a === 'settings') return settings.show(true)
  if (a === 'pause') return show(runs(live.screen) ? 'pause' : live.screen)
  if (a === 'map' && live.screen === 'title') return
  if (a === 'resume') return show('play')
  if (a === 'shove') {
    moved(restart(live.g, live.shove))
    live.target = undefined
    return show('play')
  }
  if (a === 'back') return show(back(live.screen))
  return show(a)
}
onFront.go = go

// Losing the pointer lock in play (Esc, switching windows) pauses, unless a panel took it.
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && runs(live.screen) && !live.g.panel && !settings.open()) go('pause')
})

// Saves the path, and the journal with it, whenever the path grows: Continue and the text build resume from there.
const save = (g: Game): void => {
  const path = savePath(g.path)
  const log = saveLog(g.path, live.log)
  if (live.saved === path + log) return
  live.saved = path + log
  if (g.path.length) store.write(SAVE_KEY, path)
  store.write(JOURNAL_KEY, log)
}

// Off the game: the title turns its camera slowly; a pause holds the last frame and the story clock.
const offGame = (dt: number): void => {
  if (live.screen !== 'title') return
  const g = live.g
  const turn = reduced(live.prefs, reducedMotion.matches) ? 0 : TITLE_TURN * dt
  const next = follow(live.rig, spaces[g.space], g.pos, g.facing, { yaw: turn, pitch: 0 }, dt, 0, playerBody(g).eye + footY(g), undefined)
  live.rig = next.rig
  view.sync(g, dt, next.pose)
}

drawFront()

view.app.on('update', (dtRaw: number) => {
  const dt = Math.min(dtRaw, 0.1)
  const pad = readPad()
  if (!runs(live.screen)) {
    padFrame(pad)
    offGame(dt)
    return
  }
  if (live.interactive === undefined) {
    live.interactive = performance.now()
    performance.mark('second-rush:interactive')
  }
  live.now += dt
  const l3 = pad ? pressedNow(live.pad, pad.buttons, PAD.l3) : false
  const lean = pad ? padMove(pad) : { x: 0, y: 0 }
  live.run = runLatch(live.run, l3, Math.hypot(lean.x, lean.y))
  const padBefore = live.pad
  padFrame(pad)
  const frame = input(pad, dt)
  // In the barfight the verbs pressed since the last tick go with this one (fightControls.ts).
  const verbs = live.g.brawl ? fightIntent(live.controls.bindings, live.keys, live.pressed, pad, padBefore) : undefined
  live.pressed.clear()
  moved(tick(live.g, verbs ? { ...frame.input, verbs } : frame.input, dt))
  if (live.fighting !== !!live.g.brawl) {
    live.fighting = !!live.g.brawl
    renderHelp()
  }
  const more = (n: number): void => {
    if (n <= 0 || live.g.panel) return
    moved(tick(live.g, input(pad, dt).input, dt))
    more(n - 1)
  }
  more(live.pace - 1)
  placeRig(live.g)
  const g = live.g
  const sway = bob(g.t, length(g.vel), topSpeed(frame.input, spaces[g.space].interior), reduced(live.prefs, reducedMotion.matches))
  const next = follow(live.rig, spaces[g.space], g.pos, g.facing, g.panel ? { yaw: 0, pitch: 0 } : frame.look, dt, sway, playerBody(g).eye + footY(g), heldBehind(g))
  live.rig = next.rig
  view.sync(g, dt, next.pose)
  audio.sync(g, dt)
  // The guitar in the hotel bar covers the room's voices by how well it is played (mixer.ts, coverGain).
  audio.setCover(cover(g.bar))
  renderHud(g)
  syncStealth(g)
  syncSigns(g, view.screenAt)
  const seen = seenAt(live.log.seen, g)
  if (seen !== live.log.seen) live.log = { ...live.log, seen }
  live.objective = objectiveFor(live.objective, g.story, live.now)
  front.objective(g.panel ? undefined : objectiveShown(live.objective, live.now))
  save(g)
})

Object.assign(window, {
  __frontEnd: {
    screen: () => live.screen,
    go,
    // Milliseconds from the title's button (or the page's start, for a link) to the first frame the player controls.
    timing: () => ({ began: live.began ?? 0, interactive: live.interactive }),
  },
  __prologue: {
    game: () => live.g,
    talk: () => live.talk,
    walkTo: (x: number, z: number) => {
      live.target = vec(x, z)
    },
    textBuild: () => textBuild(live.g),
    camera: () => live.rig,
    eye: () => {
      const p = view.camera.getPosition()
      return [p.x, p.y, p.z]
    },
    aim: (yaw: number, pitch: number) => {
      live.rig = { ...live.rig, yaw, pitch, idle: 0 }
    },
    audio: () => audio.status(),
    pace: (n: number) => {
      live.pace = Math.max(1, Math.round(n))
    },
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
      camera: {
        get: (): Placed => ({ rig: live.rig, key: live.rigFor }),
        set: (c) => {
          const { rig, key } = c as Placed
          live.rig = rig
          live.rigFor = key
        },
      },
    }),
  )
}

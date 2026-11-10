// Dev-only test space for the combat core (`make serve/game`, then /fbx67/play/fight.html): the player against one man
// in a plain room with a counter, bottles, a stove, a rack and a mud floor, on keyboard or gamepad. Blocks for bodies;
// the barfight's own room, cast and sound are #176's. `?test=1` exposes the fight as window.__fight.
import * as pc from 'playcanvas'
import type { Fight, FightEvent, Fighter, Thing } from './combat.ts'
import { PUNCH_WINDUP, details, step } from './combat.ts'
import { D, PLAYER, W, counter, stove, testFight, walls } from './fightSpace.ts'
import { fightHelp, intent, restart } from './fightControls.ts'
import type { Device, Pad } from './input.ts'
import { STORAGE_KEY, padActive, padKind, parseControls, safeStore } from './input.ts'
import type { Box } from './world.ts'

const canvas = document.getElementById('scene') as HTMLCanvasElement
const hud = document.getElementById('hud') as HTMLElement
const help = document.getElementById('help') as HTMLElement
const flash = document.getElementById('flash') as HTMLElement

const app = new pc.Application(canvas, {})
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
app.setCanvasResolution(pc.RESOLUTION_AUTO)
window.addEventListener('resize', () => app.resizeCanvas())
app.scene.ambientLight = new pc.Color(0.38, 0.34, 0.3)

const camera = new pc.Entity('camera')
camera.addComponent('camera', { fov: 45, nearClip: 0.1, farClip: 60, clearColor: new pc.Color(0.08, 0.07, 0.06) })
app.root.addChild(camera)

const lamp = new pc.Entity('lamp')
lamp.addComponent('light', { type: 'omni', range: 14, intensity: 1.3, color: new pc.Color(1, 0.85, 0.6), castShadows: true })
lamp.setPosition(0, 3.2, 0)
app.root.addChild(lamp)

const material = (hex: string, glow = false): pc.StandardMaterial => {
  const m = new pc.StandardMaterial()
  const c = new pc.Color().fromString(hex)
  m.diffuse = c
  if (glow) m.emissive = c
  m.update()
  return m
}

const block = (type: 'box' | 'cylinder' | 'plane' | 'capsule' | 'sphere', hex: string, parent: pc.Entity = app.root): pc.Entity => {
  const e = new pc.Entity()
  e.addComponent('render', { type, material: material(hex) })
  parent.addChild(e)
  return e
}

const placeBox = (b: Box, h: number, hex: string): pc.Entity => {
  const e = block('box', hex)
  e.setLocalScale(b.w, h, b.d)
  e.setPosition(b.x, h / 2, b.z)
  return e
}

const ground = block('plane', '#4a3d2e')
ground.setLocalScale(W, 1, D)
// The near wall is left out of the picture so the camera can see over it.
walls.filter((b) => b.z < D / 2).forEach((b) => placeBox(b, 2.6, '#6b5a45'))
placeBox(counter, 1.05, '#5a3a22')
placeBox(stove, 0.9, '#2a2624')
const hot = block('box', '#c4501e')
hot.setLocalScale(stove.w * 0.7, 0.04, stove.d * 0.7)
hot.setPosition(stove.x, 0.92, stove.z)

const colors: Readonly<Record<string, string>> = { [PLAYER]: '#3c5a78', drunk: '#7a4a2a' }

type Body = Readonly<{ root: pc.Entity; lean: pc.Entity; body: pc.Entity }>

const bodies = new Map<string, Body>()
const bodyFor = (x: Fighter): Body => {
  const had = bodies.get(x.id)
  if (had) return had
  const root = new pc.Entity()
  app.root.addChild(root)
  const lean = new pc.Entity()
  root.addChild(lean)
  const body = block('capsule', colors[x.id] ?? '#666', lean)
  body.setLocalScale(0.5, 1.3, 0.4)
  body.setLocalPosition(0, 0.65, 0)
  const head = block('sphere', '#d9a77f', lean)
  head.setLocalScale(0.26, 0.28, 0.26)
  head.setLocalPosition(0, 1.5, 0)
  const nose = block('box', '#d9a77f', lean)
  nose.setLocalScale(0.08, 0.08, 0.12)
  nose.setLocalPosition(0, 1.5, 0.15)
  const made = { root, lean, body }
  bodies.set(x.id, made)
  return made
}

const things = new Map<string, pc.Entity>()
const thingFor = (t: Thing): pc.Entity => {
  const had = things.get(t.id)
  if (had) return had
  const e = t.kind === 'rack' ? block('box', '#8a7356') : block('cylinder', '#2f6b3a')
  if (t.kind === 'rack') e.setLocalScale(1.8, 0.5, 0.15)
  else e.setLocalScale(0.08, 0.3, 0.08)
  things.set(t.id, e)
  return e
}

const deg = 180 / Math.PI

// How a man stands: lying, getting up, rocked back by a hit or winding up to throw.
const leanOf = (x: Fighter): number => {
  if (x.stance === 'down') return -88
  if (x.stance === 'rising') return -88 * Math.max(0, x.timer / 0.8)
  if (x.stance === 'staggered' || x.stance === 'held') return -18
  if (x.stance === 'burned') return 12
  if (x.windup !== undefined) return -14 * (x.windup / PUNCH_WINDUP)
  return 0
}

const sync = (f: Fight, t: number): void => {
  f.fighters.forEach((x) => {
    const b = bodyFor(x)
    b.root.setPosition(x.pos.x, 0, x.pos.z)
    b.root.setEulerAngles(0, x.facing * deg, 0)
    b.lean.setLocalEulerAngles(leanOf(x), 0, 0)
    const m = b.body.render?.meshInstances[0]?.material as pc.StandardMaterial | undefined
    if (m) {
      m.emissive = x.stance === 'burned' ? new pc.Color(0.5 + 0.3 * Math.sin(t * 20), 0.15, 0) : new pc.Color(0, 0, 0)
      m.update()
    }
  })
  f.things.forEach((x) => {
    const e = thingFor(x)
    const by = f.fighters.find((y) => y.id === x.by)
    const ahead = by ? { x: Math.sin(by.facing), z: Math.cos(by.facing) } : { x: 0, z: 0 }
    const at = by ? { x: by.pos.x + ahead.x * 0.6, z: by.pos.z + ahead.z * 0.6 } : x.pos
    const y = by ? 1.1 : x.kind === 'rack' ? (x.pos.x < -W / 2 + 1 ? 1.9 : 0.1) : x.pos.z < counter.z + 0.5 ? 1.2 : 0.05
    e.setPosition(at.x, y, at.z)
    e.setEulerAngles(0, (by ? by.facing : x.kind === 'rack' && x.pos.x < -W / 2 + 1 ? Math.PI / 2 : 0) * deg, 0)
    if (x.broken) e.setLocalScale(0.08, 0.14, 0.08)
  })
}

const store = safeStore(() => window.localStorage)
const controls = parseControls(store.read(STORAGE_KEY))

const live: { f: Fight; keys: Set<string>; pressed: Set<string>; pad: readonly boolean[]; device: Device; shake: number } = {
  f: testFight(),
  keys: new Set(),
  pressed: new Set(),
  pad: [],
  device: 'keyboard',
  shake: 0,
}

window.addEventListener('keydown', (e) => {
  live.device = 'keyboard'
  if (e.repeat) return
  live.keys.add(e.code)
  live.pressed.add(e.code)
  if (e.code === 'Space' || e.code === 'Backspace') e.preventDefault()
})
window.addEventListener('keyup', (e) => live.keys.delete(e.code))
window.addEventListener('blur', () => live.keys.clear())

const readPad = (): Pad | undefined => {
  const p = Array.from(navigator.getGamepads?.() ?? []).find((x) => x && x.connected)
  return p ? { id: p.id, axes: Array.from(p.axes), buttons: p.buttons.map((b) => b.pressed) } : undefined
}

const SHAKE = 0.12

const feel = (events: readonly FightEvent[]): void => {
  events.forEach((e) => {
    if (e.kind === 'hit') live.shake = Math.max(live.shake, SHAKE * (e.who === PLAYER ? 1.4 : 0.8) * Math.min(3, e.weight ?? 1))
    if (e.kind === 'down' || e.kind === 'slip' || e.kind === 'thud' || e.kind === 'smash') live.shake = Math.max(live.shake, SHAKE * 1.6)
    if (e.kind === 'shove') live.shake = Math.max(live.shake, SHAKE * 0.4)
  })
}

const status = (f: Fight): string => {
  const me = f.fighters.find((x) => x.id === PLAYER)!
  const left = Math.max(0, f.endsAt - f.t).toFixed(0)
  if (f.over) {
    const d = details(f)
    return `Over at ${f.endsAt} s. Move: ${d.move}. Stood with: ${d.stood ? 'yes' : 'n/a'}. Caught: ${d.redHanded ? 'red-handed' : 'clean'}.`
  }
  const state = me.stance === 'down' ? (me.timer <= 0 ? 'Down: any verb to get up' : 'Down') : me.stance
  return `${f.t.toFixed(0)} s (${left} to the law) · ${state}${me.holding ? ` · holding ${me.holding}` : ''}`
}

app.on('update', (dtRaw: number) => {
  const dt = Math.min(dtRaw, 0.1)
  const pad = readPad()
  if (pad && padActive(pad)) live.device = padKind(pad.id)
  if (restart(live.pressed, pad, live.pad)) live.f = testFight()
  const i = intent(controls.bindings, live.keys, live.pressed, pad, live.pad)
  live.pressed.clear()
  live.pad = pad?.buttons ?? []
  live.f = step(live.f, i, dt)
  feel(live.f.events)
  sync(live.f, live.f.t)
  const me = live.f.fighters.find((x) => x.id === PLAYER)!
  live.shake = Math.max(0, live.shake - dt * 0.8)
  const jitter = (): number => (Math.random() * 2 - 1) * live.shake
  camera.setPosition(me.pos.x * 0.6 + jitter(), 7.5 + jitter(), me.pos.z * 0.6 + 7)
  camera.lookAt(me.pos.x * 0.6, 0.6, me.pos.z * 0.6)
  const warn = live.f.t >= live.f.warnAt && !live.f.over
  flash.style.opacity = warn ? String(0.25 + 0.2 * Math.sin(live.f.t * 9)) : '0'
  hud.textContent = status(live.f)
  help.textContent = fightHelp(live.device, controls.bindings)
})

app.start()

if (new URLSearchParams(window.location.search).get('test') === '1') Object.assign(window, { __fight: () => live.f })

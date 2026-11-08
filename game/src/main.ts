import './style.css'
import type { Game, Input } from './prologue.ts'
import { HIDE_TIME, ended, focus, interact, press, start, tick, textBuildHash } from './prologue.ts'
import { createView } from './render.ts'
import { spaces } from './levels.ts'
import type { Vec } from './world.ts'
import { distance, sub, vec } from './world.ts'

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
const barEl = $('hidebar')
const barFill = $('hidebar-fill')

const view = createView(canvas)

const keys = new Set<string>()
const live: { g: Game; target?: Vec; touchHold: boolean; shown?: unknown } = { g: start(), touchHold: false }

const textBuild = (g: Game): string => new URL(`../${textBuildHash(g)}`, window.location.href).toString()

const act = (f: (g: Game) => Game): void => {
  live.g = f(live.g)
  live.target = undefined
}

const choose = (id: string): void => {
  if (id === 'continue' && ended(live.g)) {
    window.location.href = textBuild(live.g)
    return
  }
  act((g) => press(g, id))
}

const renderPanel = (g: Game): void => {
  if (live.shown === g.panel) return
  live.shown = g.panel
  panelEl.hidden = !g.panel
  document.body.dataset.panel = g.panel ? 'open' : ''
  if (!g.panel) return
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

const renderHud = (g: Game): void => {
  const f = focus(g)
  promptEl.hidden = !f || !!g.hiding
  promptEl.innerHTML = f ? `<span class="key">E</span>${f.prompt}` : ''
  placeEl.textContent = spaces[g.space].name
  barEl.hidden = !g.hiding
  barFill.style.width = `${Math.min(100, ((g.hiding?.progress ?? 0) / HIDE_TIME) * 100)}%`
  renderPanel(g)
}

const direction = (): Vec => {
  const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
  const z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
  if (x || z) {
    live.target = undefined
    return vec(x, z)
  }
  if (live.target && distance(live.target, live.g.pos) > 0.15) return sub(live.target, live.g.pos)
  live.target = undefined
  return vec(0, 0)
}

const input = (): Input => ({
  dir: direction(),
  hold: keys.has('KeyE') || keys.has('Space') || live.touchHold,
  limit: live.target ? distance(live.target, live.g.pos) : undefined,
})

window.addEventListener('keydown', (e) => {
  if (e.repeat) return
  keys.add(e.code)
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
  if (e.code === 'KeyE' || e.code === 'Space') {
    e.preventDefault()
    act(interact)
  }
})
window.addEventListener('keyup', (e) => keys.delete(e.code))
window.addEventListener('blur', () => keys.clear())

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

canvas.addEventListener('pointerdown', (e) => {
  if (live.g.panel) return
  const r = canvas.getBoundingClientRect()
  const hit = view.groundAt(e.clientX - r.left, e.clientY - r.top)
  if (hit) live.target = vec(hit.x, hit.z)
})

view.app.on('update', (dtRaw: number) => {
  const dt = Math.min(dtRaw, 0.1)
  live.g = tick(live.g, input(), dt)
  view.sync(live.g, dt)
  renderHud(live.g)
})

Object.assign(window, {
  __prologue: {
    game: () => live.g,
    walkTo: (x: number, z: number) => {
      live.target = vec(x, z)
    },
    textBuild: () => textBuild(live.g),
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

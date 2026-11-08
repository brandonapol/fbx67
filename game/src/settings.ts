import type { Action, Controls } from './input.ts'
import { SENSITIVITY, actionNames, actions, defaults, keyLabel, rebind } from './input.ts'

export type Settings = Readonly<{ open: () => boolean }>

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el as T
}

export const mountSettings = (get: () => Controls, set: (c: Controls) => void): Settings => {
  const panel = $('settings')
  const opener = $<HTMLButtonElement>('settings-open')
  const invert = $<HTMLInputElement>('invert-y')
  const sensitivity = $<HTMLInputElement>('sensitivity')
  const list = $('bindings')
  const state: { waiting?: Action } = {}

  sensitivity.min = String(SENSITIVITY.min)
  sensitivity.max = String(SENSITIVITY.max)

  const draw = (): void => {
    const c = get()
    invert.checked = c.invertY
    sensitivity.value = String(c.sensitivity)
    list.replaceChildren(
      ...actions.map((a) => {
        const row = document.createElement('div')
        row.className = 'binding'
        const name = Object.assign(document.createElement('span'), { textContent: actionNames[a] })
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.action = a
        button.textContent = state.waiting === a ? 'Press a key' : c.bindings[a].map(keyLabel).join(' / ')
        button.addEventListener('click', () => {
          state.waiting = a
          draw()
        })
        row.append(name, button)
        return row
      }),
    )
  }

  const show = (open: boolean): void => {
    panel.hidden = !open
    state.waiting = undefined
    if (open) {
      if (document.pointerLockElement) document.exitPointerLock()
      draw()
    }
  }

  opener.addEventListener('click', () => show(panel.hidden))
  $('settings-close').addEventListener('click', () => show(false))
  $('settings-reset').addEventListener('click', () => {
    set(defaults)
    draw()
  })
  invert.addEventListener('change', () => set({ ...get(), invertY: invert.checked }))
  sensitivity.addEventListener('input', () => set({ ...get(), sensitivity: Number(sensitivity.value) }))

  window.addEventListener(
    'keydown',
    (e) => {
      if (panel.hidden) return
      e.stopImmediatePropagation()
      const a = state.waiting
      if (!a) {
        if (e.code === 'Escape') show(false)
        return
      }
      e.preventDefault()
      state.waiting = undefined
      if (e.code !== 'Escape') set(rebind(get(), a, e.code))
      draw()
    },
    { capture: true },
  )

  return { open: () => !panel.hidden }
}

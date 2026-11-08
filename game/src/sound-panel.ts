import './sound.css'
import type { Audio } from './audio.ts'
import type { Bus } from './mixer.ts'
import { BUSES, BUS_LABELS } from './mixer.ts'

const ADJUST: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

const slider = (audio: Audio, bus: Bus): readonly HTMLElement[] => {
  const id = `sound-${bus}`
  const label = Object.assign(document.createElement('label'), { htmlFor: id, textContent: BUS_LABELS[bus] })
  const input = Object.assign(document.createElement('input'), {
    id,
    type: 'range',
    min: '0',
    max: '100',
    step: '1',
    value: String(Math.round(audio.volumes()[bus] * 100)),
  })
  input.dataset.bus = bus
  input.addEventListener('input', () => audio.setVolume(bus, Number(input.value) / 100))
  input.addEventListener('pointerup', () => input.blur())
  return [label, input]
}

export const mountSoundPanel = (audio: Audio, parent: HTMLElement = document.body): HTMLElement => {
  const root = Object.assign(document.createElement('div'), { id: 'sound' })
  const toggle = Object.assign(document.createElement('button'), { id: 'sound-toggle', type: 'button', textContent: 'Sound' })
  const panel = Object.assign(document.createElement('div'), { id: 'sound-panel', hidden: true })
  panel.setAttribute('role', 'group')
  panel.setAttribute('aria-label', 'Volume')
  panel.append(...BUSES.flatMap((b) => slider(audio, b)))
  const show = (open: boolean): void => {
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    if (!open && document.activeElement instanceof HTMLElement && root.contains(document.activeElement)) document.activeElement.blur()
  }
  show(false)
  toggle.addEventListener('click', () => {
    show(panel.hidden)
    toggle.blur()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) show(false)
  })
  root.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement && ADJUST.has(e.key)) e.stopPropagation()
  })
  root.append(toggle, panel)
  parent.append(root)
  return root
}

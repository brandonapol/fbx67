import './sound.css'
import type { Audio } from './audio.ts'
import type { Bus } from './mixer.ts'
import { BUSES, BUS_LABELS } from './mixer.ts'

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
  return [label, input]
}

export const mountSoundPanel = (audio: Audio, parent: HTMLElement = document.body): HTMLElement => {
  const root = Object.assign(document.createElement('div'), { id: 'sound' })
  const toggle = Object.assign(document.createElement('button'), { id: 'sound-toggle', type: 'button', textContent: 'Sound' })
  const panel = Object.assign(document.createElement('div'), { id: 'sound-panel', hidden: true })
  panel.setAttribute('role', 'group')
  panel.setAttribute('aria-label', 'Volume')
  panel.append(...BUSES.flatMap((b) => slider(audio, b)))
  toggle.setAttribute('aria-expanded', 'false')
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden
    toggle.setAttribute('aria-expanded', String(!panel.hidden))
    toggle.blur()
  })
  root.addEventListener('keydown', (e) => e.stopPropagation())
  root.addEventListener('pointerdown', (e) => e.stopPropagation())
  root.append(toggle, panel)
  parent.append(root)
  return root
}

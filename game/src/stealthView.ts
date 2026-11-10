import type { Game } from './prologue.ts'
import { curlyNow, watchOf } from './prologue.ts'
import { CAUGHT_LINE } from './curly.ts'

// Readable stealth at the survey camp (#49): instead of a cone on the ground, a small eye at the top of the screen.
// It is shut while Curly is at work, half open while his head turns (he is about to look), open while he looks, and
// its ring fills as he sees Owen. When he catches Owen hiding, his line shows under it for the busted beat.

export type Eye = 'shut' | 'turning' | 'open'

export type Stealth = Readonly<{ shown: boolean; eye: Eye; aware: number; line?: string }>

export const stealthOf = (g: Game): Stealth => {
  if (g.space !== 'camp' || g.panel || g.flight !== undefined) return { shown: false, eye: 'shut', aware: 0 }
  const w = watchOf(g)
  const p = curlyNow(g)
  const turning = !p.eyes && (p.beat === 'glance' || (w.alarm !== undefined && Math.abs(p.head) > 0.05))
  const eye: Eye = p.eyes ? 'open' : turning ? 'turning' : 'shut'
  return { shown: true, eye, aware: w.aware, line: w.caught !== undefined ? `Curly: "${CAUGHT_LINE}"` : undefined }
}

const RING = 2 * Math.PI * 15

const markup = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="track" cx="18" cy="18" r="15"/><circle class="fill" cx="18" cy="18" r="15" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/><path class="lid" d="M8 18 Q18 9 28 18 Q18 27 8 18 Z"/><circle class="pupil" cx="18" cy="18" r="3.4"/></svg>`

export const mountStealth = (): ((g: Game) => void) => {
  const el = document.createElement('div')
  el.id = 'stealth'
  el.hidden = true
  el.setAttribute('role', 'img')
  el.innerHTML = markup
  const line = document.createElement('div')
  line.id = 'stealth-line'
  line.hidden = true
  line.setAttribute('aria-live', 'assertive')
  document.body.append(el, line)
  const fill = el.querySelector<SVGCircleElement>('.fill')
  const last: { key?: string } = {}
  return (g: Game): void => {
    const s = stealthOf(g)
    const key = `${s.shown}|${s.eye}|${s.aware.toFixed(2)}|${s.line ?? ''}`
    if (key === last.key) return
    last.key = key
    el.hidden = !s.shown
    el.dataset.eye = s.eye
    el.setAttribute('aria-label', s.eye === 'open' ? (s.aware > 0 ? 'Curly can see you' : 'Curly is looking') : s.eye === 'turning' ? 'Curly is turning' : 'Curly is at work')
    fill?.setAttribute('stroke-dashoffset', String(RING * (1 - s.aware)))
    line.hidden = !s.line
    line.textContent = s.line ?? ''
  }
}

import type { Game } from './prologue.ts'
import { curlyNow, watchOf } from './prologue.ts'
import { CAUGHT_LINE } from './curly.ts'
import type { Lab } from './photoLab.ts'
import { catcher, spotter } from './photoLab.ts'

// Readable stealth at the survey camp (#49): instead of a cone on the ground, a small eye at the top of the screen.
// It is shut while Curly is at work, half open while his head turns (he is about to look), open while he looks, and
// its ring fills as he sees Owen. When he catches Owen hiding, his line shows under it for the busted beat.
//
// In the photo lab (photoLab.ts) the same eye reads the lab's people: open while one of them can see Wade where he has
// no business, half open when one will in a moment (footsteps in the hall), its ring filling as he is seen.

export type Eye = 'shut' | 'turning' | 'open'

export type Stealth = Readonly<{ shown: boolean; eye: Eye; aware: number; line?: string; who?: string }>

// How far ahead the eye warns of someone about to see Wade where he stands, in seconds.
export const WARN = 2

const labStealth = (g: Game, l: Lab): Stealth => {
  const now = spotter(l.way, l.clock, g.pos)
  const soon = now ? undefined : [0.5, 1, 1.5, WARN].map((d) => spotter(l.way, l.clock + d, g.pos)).find(Boolean)
  const caught = l.caught !== undefined ? catcher(l) : undefined
  return {
    shown: true,
    eye: now ? 'open' : soon ? 'turning' : 'shut',
    aware: l.aware,
    who: (caught ?? now ?? soon)?.who ?? 'Nobody',
    line: caught ? `${caught.who}: "${caught.line}"` : undefined,
  }
}

export const stealthOf = (g: Game): Stealth => {
  if (g.space === 'eielson' && g.lab && !g.panel) return labStealth(g, g.lab)
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
    const key = `${s.shown}|${s.eye}|${s.aware.toFixed(2)}|${s.line ?? ''}|${s.who ?? ''}`
    if (key === last.key) return
    last.key = key
    el.hidden = !s.shown
    el.dataset.eye = s.eye
    // Curly at the camp unless the lab names who.
    const who = s.who ?? 'Curly'
    el.setAttribute('aria-label', s.eye === 'open' ? (s.aware > 0 ? `${who} can see you` : `${who} is looking`) : s.eye === 'turning' ? `${who} is turning` : s.who ? 'Nobody is looking' : 'Curly is at work')
    fill?.setAttribute('stroke-dashoffset', String(RING * (1 - s.aware)))
    line.hidden = !s.line
    line.textContent = s.line ?? ''
  }
}

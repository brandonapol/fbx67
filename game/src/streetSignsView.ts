import type { Game } from './prologue.ts'
import './streetSigns.css'
import { BLADE_Y, readable } from './streetSigns.ts'

// The names on the street signs (streetSigns.ts), written over the blades in the page's own type so they stay
// readable at any resolution: one label per blade, placed each frame where the camera sees it.

type ScreenAt = (x: number, y: number, z: number) => Readonly<{ x: number; y: number }> | undefined

const MAX_SHOWN = 4

export const mountSigns = (parent: HTMLElement): ((g: Game, screenAt: ScreenAt) => void) => {
  const root = Object.assign(document.createElement('div'), { id: 'street-signs' })
  root.setAttribute('aria-hidden', 'true')
  parent.append(root)
  const pool = Array.from({ length: MAX_SHOWN * 2 }, () => {
    const el = Object.assign(document.createElement('span'), { className: 'street-sign' })
    el.hidden = true
    root.append(el)
    return el
  })
  return (g, screenAt) => {
    const shown = (g.space === 'downtown' || g.space === 'flood') && !g.panel ? readable(g.pos).slice(0, MAX_SHOWN) : []
    const blades = shown.flatMap((s) => s.texts.map((text, i) => ({ text, at: screenAt(s.at.x, BLADE_Y[i]! + 0.11, s.at.z) })))
    pool.forEach((el, i) => {
      const b = blades[i]
      el.hidden = !b?.at
      if (!b?.at) return
      if (el.textContent !== b.text) el.textContent = b.text
      el.style.transform = `translate(${b.at.x}px, ${b.at.y}px) translate(-50%, -50%)`
    })
  }
}

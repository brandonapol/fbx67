import type { PocketMap } from './frontEndMap.ts'
import type { Rect } from './downtown.ts'

// Draws the pocket map (frontEndMap.ts) as SVG in the sheet's own meters: x east, z south, so north is up. The town
// sheet has the Chena along its north edge; the base sheet has no river.

const NS = 'http://www.w3.org/2000/svg'

const svg = (tag: string, attrs: Readonly<Record<string, string | number>>, text?: string): SVGElement => {
  const e = document.createElementNS(NS, tag)
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)))
  if (text !== undefined) e.textContent = text
  return e
}

const box = (r: Rect, cls: string): SVGElement => svg('rect', { x: r[0], y: r[2], width: r[1] - r[0], height: r[3] - r[2], class: cls })

const label = (r: Rect, text: string, cls: string): SVGElement => {
  const w = r[1] - r[0]
  const h = r[3] - r[2]
  const x = (r[0] + r[1]) / 2
  const y = (r[2] + r[3]) / 2
  return svg('text', { x, y, class: cls, transform: h > w * 2 ? `rotate(-90 ${x} ${y})` : '' }, text)
}

export const drawMap = (root: HTMLElement, m: PocketMap): void => {
  const [x0, x1, z0, z1] = m.play
  const map = svg('svg', { viewBox: `${x0} ${z0} ${x1 - x0} ${z1 - z0}`, role: 'img', 'aria-label': `Street map: ${m.title}` })
  const river: Rect | undefined = m.water === undefined ? undefined : [x0, x1, z0, m.water]
  map.append(
    box(m.play, 'land'),
    ...(river ? [box(river, 'water'), label(river, 'Chena River', 'river')] : []),
    ...m.streets.map((s) => box(s.rect, 'street')),
    ...m.streets.map((s) => label(s.rect, s.name, 'street-name')),
    ...m.spots.map((s) => box(s.rect, ['spot', s.known ? 'known' : '', s.here ? 'here' : '', s.next ? 'next' : ''].join(' ').trim())),
    ...m.spots.filter((s) => s.known).map((s) => label(s.rect, s.name, 'spot-name')),
  )
  if (m.you) {
    const { at, facing } = m.you
    const g = svg('g', { class: 'you', transform: `translate(${at.x} ${at.z}) rotate(${(-facing * 180) / Math.PI})` })
    g.append(svg('circle', { r: 3.2 }), svg('path', { d: 'M0 8 L-3 2 L3 2 Z' }))
    map.append(g)
  }
  const margin = document.createElement('ul')
  margin.className = 'margin'
  margin.append(
    ...m.margin.map((p) => {
      const li = Object.assign(document.createElement('li'), { textContent: p.name })
      li.className = [p.here ? 'here' : '', p.next ? 'next' : ''].join(' ').trim()
      return li
    }),
  )
  const where = Object.assign(document.createElement('p'), { className: 'goal', textContent: m.goal ?? '' })
  const legend = Object.assign(document.createElement('p'), { className: 'legend', innerHTML: '<span class="k here"></span>You are here<br><span class="k next"></span>Where to go' })
  const aside = document.createElement('div')
  aside.className = 'aside'
  aside.append(Object.assign(document.createElement('h3'), { className: 'sheet-title', textContent: m.title }), legend, ...(m.margin.length ? [Object.assign(document.createElement('h3'), { textContent: 'Off this map' }), margin] : []))
  root.replaceChildren(where, map, aside)
}

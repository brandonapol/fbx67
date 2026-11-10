import type { State } from '../../text-game/src/types.ts'
import { clock } from '../../text-game/src/story.ts'
import { say } from '../../text-game/src/ambient/select.ts'
import { prologueThings } from '../../text-game/src/ambient/prologueThings.ts'
import type { Game, Panel } from './prologue.ts'
import type { Interactable } from './world.ts'

// The things in Owen's room besides the desk and the bed (issue #47): the survey maps pinned by the window and the
// reel-to-reel on the trunk. Neither sends a note; looking and listening never move the story. Every word comes from
// the story layer: the tape is the reel-to-reel's `use` line in prologueThings, and the maps carry only place names.
// The space (levels.ts) and the interact switch (prologue.ts) take these in; this file owns what they do.

// Where they stand in the room's meters (levels.ts: the maps either side of the window at z -2.83, the reel-to-reel
// on the trunk at (2.3, -2.3)). The spots sit in front of each, where Owen stands to use it.
export const roomThings: readonly Interactable[] = [
  { id: 'maps', x: -0.65, z: -2.0, r: 1.0, prompt: 'Look at the survey maps' },
  { id: 'reel', x: 2.3, z: -1.6, r: 1.0, prompt: 'Play the tape' },
]

export const isRoomThing = (id: string): boolean => roomThings.some((t) => t.id === id)

// On the July night, until he sleeps. In the August flood the room is only the way down.
export const roomThingsOpen = (story: State): boolean => story.scene === 'p_letter'

const reelToReel = (() => {
  const t = prologueThings.find((a) => a.id === 'reelToReel')
  if (!t) throw new Error('no reelToReel in prologueThings')
  return t
})()

const capital = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)

const back: Panel['buttons'] = [{ id: 'close', label: 'Step back.' }]

// The tape: the reel-to-reel's first `use` line, the one where Owen threads it and hears his own voice.
export const reelPanel = (story: State): Panel => ({
  kind: 'talk',
  title: capital(reelToReel.name),
  text: say(story, reelToReel, 'use', {})?.bit.lines.map((l) => l.text).join(' ') ?? '',
  buttons: back,
})

// The maps close-up: the panel's text is empty; the view draws mapSheet() in its place.
export const mapsPanel: Panel = { kind: 'talk', title: 'The survey maps', text: '', buttons: back }

// What using one of the room's things does: its panel, and the story untouched. Undefined for any other spot.
export const useRoom = (g: Game, id: string): Game | undefined => {
  if (g.space !== 'room' || !roomThingsOpen(g.story)) return undefined
  if (id === 'reel') return { ...g, panel: reelPanel(g.story) }
  if (id === 'maps') return { ...g, panel: mapsPanel }
  return undefined
}

// The sheet pinned left of the window, as data: the rivers in blue, the survey line Owen ran north out of Fairbanks in
// pencil, and the one parcel on the lower Chatanika circled in red. Coordinates on a 100 x 70 sheet, north up.
type Pt = readonly [number, number]
export const sheet = {
  rivers: {
    Tanana: [[0, 52], [20, 56], [40, 55], [62, 50], [80, 47], [100, 46]],
    Chena: [[62, 50], [70, 44], [80, 40], [92, 36]],
    Chatanika: [[30, 55], [40, 44], [52, 34], [64, 24], [78, 14], [92, 6]],
  } as Readonly<Record<string, readonly Pt[]>>,
  route: [[66, 47], [64, 38], [60, 28], [58, 18], [56, 4]] as readonly Pt[],
  parcel: { at: [40, 44] as Pt, r: 4 },
  towns: [
    { name: 'Fairbanks', at: [66, 48] as Pt },
    { name: 'Minto', at: [22, 50] as Pt },
  ],
} as const

const line = (pts: readonly Pt[]): string => pts.map(([x, y]) => `${x},${y}`).join(' ')

// The sheet as SVG for the close-up: no prose, only the marks and the place names a surveyor would letter on it.
export const mapSheet = (): string =>
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70" class="survey-map">',
    '<rect width="100" height="70" fill="#e8dcb8"/>',
    ...Object.entries(sheet.rivers).map(
      ([name, pts]) => `<polyline data-river="${name}" points="${line(pts)}" fill="none" stroke="#4a6a8a" stroke-width="0.8"/>`,
    ),
    `<polyline data-mark="route" points="${line(sheet.route)}" fill="none" stroke="#3a3a38" stroke-width="0.6" stroke-dasharray="2 1"/>`,
    `<circle data-mark="parcel" cx="${sheet.parcel.at[0]}" cy="${sheet.parcel.at[1]}" r="${sheet.parcel.r}" fill="none" stroke="#9a3b2b" stroke-width="0.7"/>`,
    ...sheet.towns.map((t) => `<text x="${t.at[0] + 1.5}" y="${t.at[1] - 1}" font-size="3" fill="#3a3a38">${t.name}</text>`),
    ...Object.entries(sheet.rivers).map(([name, pts]) => {
      const [x, y] = pts[Math.floor(pts.length / 2)]!
      return `<text x="${x + 1}" y="${y + 3}" font-size="2.4" font-style="italic" fill="#4a6a8a">${name}</text>`
    }),
    '</svg>',
  ].join('')

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// The card over the fade when Owen sleeps: the morning's date and hour, from the story's clock for the scene he wakes
// into. Undefined unless the step was the night in the room going to sleep.
export const dateCard = (from: State, to: State): string | undefined => {
  if (from.scene !== 'p_letter' || to.scene === 'p_letter') return undefined
  const c = clock(to)
  if (!c) return undefined
  const [date, time] = c.split('T') as [string, string]
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const [h, min] = time.split(':').map(Number) as [number, number]
  const day = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${day}, ${months[m - 1]} ${d}, ${y}. ${hour}:${String(min).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

import type { Place, State } from '../../text-game/src/types.ts'
import { place } from '../../text-game/src/story.ts'
import type { Chart, Spot, Way } from './pocketMapCharts.ts'
import { chartOf, placeNames, spotOn } from './pocketMapCharts.ts'
import { ahead, walkedChart } from './frontEndMap.ts'
import type { Rect } from './downtown.ts'
import { spaces } from './levels.ts'
import type { Line, Visit } from './talk.ts'
import { LOG_SIZE, readTime, targets } from './talk.ts'
import type { Vec } from './world.ts'
import { distance, vec } from './world.ts'

// Asking the way (issue #303): any townsperson tells the player how to get to where the story points next ("the Nordale
// is up on Second"), from the same chart the pocket map and the street signs read (pocketMapCharts.ts). Which place is
// the story's: ahead(state), through place(); nothing here reads a gate. The words are built from the chart's way names
// and the speaker's own position, so they hold wherever they are asked. Pure.

const gap = (r: Rect, p: Vec): number => Math.hypot(Math.max(r[0] - p.x, 0, p.x - r[1]), Math.max(r[2] - p.z, 0, p.z - r[3]))

// The way a point is on, or the nearest one: a door is on the block line of the way it opens onto.
export const wayAt = (c: Chart, p: Vec): Way | undefined =>
  c.ways.reduce<Way | undefined>((best, w) => (best === undefined || gap(w.row, p) < gap(best.row, p) ? w : best), undefined)

export const onWay = (w: Way, p: Vec): boolean => gap(w.row, p) === 0

const mid = (w: Way): number => (w.runs === 'ns' ? (w.road[0] + w.road[1]) / 2 : (w.road[2] + w.road[3]) / 2)

// Two ways meet where their rights of way touch: the munitions road begins at Flight Line Road's edge.
const meets = (a: Way, b: Way): boolean => a.row[0] <= b.row[1] && b.row[0] <= a.row[1] && a.row[2] <= b.row[3] && b.row[2] <= a.row[3]

// Where along its way a point is, by the cross ways either side of it: "between Cushman and Lacey", "east of Noble".
export const between = (c: Chart, w: Way, p: Vec): string => {
  const along = w.runs === 'ew' ? p.x : p.z
  const cross = c.ways.filter((o) => o.runs !== w.runs && meets(o, w))
  const before = cross.filter((o) => mid(o) < along).sort((a, b) => mid(b) - mid(a))[0]
  const after = cross.filter((o) => mid(o) > along).sort((a, b) => mid(a) - mid(b))[0]
  const [past, short] = w.runs === 'ew' ? ['east', 'west'] : ['south', 'north']
  if (before && after) return `between ${before.short} and ${after.short}`
  if (before) return `${past} of ${before.short}`
  if (after) return `${short} of ${after.short}`
  return ''
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'] as const

// The compass point from a to b on a chart (x east, z south): north is -z.
export const heading = (a: Vec, b: Vec): (typeof COMPASS)[number] => {
  const turn = Math.atan2(b.x - a.x, -(b.z - a.z))
  return COMPASS[(Math.round(turn / (Math.PI / 4)) + 8) % 8]!
}

// Close enough that the speaker just points.
export const RIGHT_HERE = 8
// Downtown runs uphill away from the river: a place well south of the speaker is "up", well north "down".
const UPHILL = 12
// A door farther than this from its way's right of way is set back from it, "off" the way: the dorm up its lot, the
// float dock down the bank.
export const SET_BACK = 3

const capital = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)

const verticalOf = (c: Chart, from: Vec | undefined, to: Vec): string => {
  if (c.id !== 'town' || !from) return 'over'
  const dz = to.z - from.z
  return dz > UPHILL ? 'up' : dz < -UPHILL ? 'down' : 'over'
}

// The words for a spot on a chart, from where the speaker stands (when they stand on that chart).
export const wayToSpot = (c: Chart, s: Spot, from?: Vec): string => {
  const w = wayAt(c, s.door)
  if (!w) return `${s.name}? ${capital(c.title)}.`
  const where = [w.short, between(c, w, s.door)].filter(Boolean).join(', ')
  if (from && distance(from, s.door) <= RIGHT_HERE) return `${s.name}? You're standing at it.`
  const head = from ? ` Head ${heading(from, s.door)}.` : ''
  const off = gap(w.row, s.door) > SET_BACK
  const v = verticalOf(c, from, s.door)
  const prep = from && onWay(w, from) ? (off ? 'just off' : 'right along') : v === 'over' ? (off ? 'off' : 'over on') : `${v} ${off ? 'off' : 'on'}`
  const lead = `${prep} ${where}`
  return `${s.name}? ${capital(lead)}.${head}`
}

// The words for a place off the speaker's chart: the map's margin note, said aloud.
export const wayOffChart = (p: Place): string => {
  const name = placeNames[p]
  const cut = name.indexOf(', ')
  return cut < 0 ? `${name}? Can't say I know the way.` : `${name.slice(0, cut)}? ${capital(name.slice(cut + 2))}.`
}

// How to get to a place, told from `from` on chart `here` (undefined when the speaker stands on no chart).
export const wayTo = (p: Place, here?: Readonly<{ chart: Chart; from?: Vec }>): string => {
  const c = chartOf(p)
  const s = c && spotOn(c, p)
  if (!c || !s) return wayOffChart(p)
  if (here && here.chart.id !== c.id) return wayOffChart(p)
  return wayToSpot(c, s, here?.from)
}

// The place the speaker is asked about: the first the story points to next. On a walk downtown (or across the base)
// the story is already at the place the walk leads to, so with nothing further ahead that place is where the player
// is going.
export const asked = (s: State, walking = false): Place | undefined => ahead(s)[0] ?? (walking ? place(s) : undefined)

export const NOWHERE = "Couldn't tell you. Where is it you're going?"

// What a speaker standing at `from` in this visit's space says, asked the way.
export const directions = (v: Visit, from: Vec): string => {
  const g = v.game
  const walked = walkedChart(g)
  const p = asked(g.story, walked !== undefined)
  if (!p) return NOWHERE
  if (walked) return wayTo(p, { chart: walked, from })
  // Indoors, the speaker stands at the door of the building the space is in.
  const at = spaces[g.space].place ?? place(g.story)
  const c = at && chartOf(at)
  const door = c && at ? spotOn(c, at)?.door : undefined
  return wayTo(p, c ? { chart: c, ...(door ? { from: door } : {}) } : undefined)
}

const REACH = 1.6

// Ask the person with this id the way: their line goes on the talk log, after anything still being said. A thing, or
// someone out of reach, says nothing.
export const askWay = (v: Visit, id: string): Visit => {
  const t = targets(v).find((x) => x.id === id && x.ambient.kind === 'person' && distance(v.game.pos, vec(x.x, x.z)) <= Math.max(x.r, REACH))
  if (!t) return v
  const text = directions(v, vec(t.x, t.z))
  const from = Math.max(v.clock, v.talk.log.at(-1)?.until ?? v.clock)
  const line: Line = { with: t.id, who: t.id, name: t.ambient.name, text, from, until: from + readTime(text) }
  return { ...v, talk: { ...v.talk, log: [...v.talk.log, line].slice(-LOG_SIZE) } }
}

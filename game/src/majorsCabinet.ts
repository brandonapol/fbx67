import type { State } from '../../text-game/src/types.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { Box, Vec } from './world.ts'
import { angleBetween, angleTo, distance, lineOfSight, vec } from './world.ts'
import type { Rect } from './downtown.ts'
import { BACK_SPOT, DESK_SPOT, DIAL_SPOT, MAJORS_OFFICE, PAGE_SPOT, PRY_SPOT, SQUADRON, pieces } from './eielson.ts'

export { BACK_SPOT, DESK_SPOT, DIAL_SPOT, PAGE_SPOT, PRY_SPOT }

// The Major's cabinet (docs/acts/act2-missions.md, section 3). Lucy asks at her kitchen table (kitchen.ts), where
// refusing sends Lucy in herself (a2_co_lucy, the story's scene, staged as its menu). Searching tonight brings Wade to
// the squadron building after hours, in the hall outside the Major's dark office, as the duty airman leaves his desk on
// his rounds. Wade looks at the desk (the calendar with its circled date), dials the cabinet's combination or gives up
// on the dial and pries it, photographs the files a page at a time, puts it all back, and gets out.
//
// The game never tells the player the combination: the dial opens only on the circled date, and only once Wade has
// looked at the calendar. Notes go only at the moments the story's menus stand for: the way in (`combo` or `forced`)
// as the cabinet opens, the getaway (`getOut` or `goNow`) as he steps out of the office with everything back. Busted
// is a retry from the last checkpoint, and the story never hears of it (Rule 4). Everything between is `Cabinet`.

export type GotIn = 'combo' | 'forced'
// The cabinet shut, open with the files, or everything photographed and back in the drawer.
export type Phase = 'shut' | 'open' | 'back'

// The circled date on the Major's desk calendar, month, day, year: 1 November 1969, two years out. A retirement takes
// effect on the first of a month. It is the combination; nothing in the game says so.
export const COMBINATION: readonly [number, number, number] = [11, 1, 69]

// Prying the drawer seam with the screwdriver, a page under the flashlight, putting it all back: seconds held.
export const PRY_TIME = PRY_SPOT.hold
export const PAGES = 6
export const PAGE_TIME = PAGE_SPOT.hold
export const PUT_BACK_TIME = BACK_SPOT.hold
// A wrong try at the dial costs time, not a fail: the airman's round goes on meanwhile.
export const WRONG_TIME = 5

// --- The duty airman, as data ---

export type Beat = Readonly<{ to: Vec }> | Readonly<{ wait: number; face?: number }>

const NORTH = Math.PI
const WEST = -Math.PI / 2

const walk = (...ps: readonly (readonly [number, number])[]): readonly Beat[] => ps.map(([x, z]) => ({ to: vec(x, z) }))

export const DESK_AT = vec(165, -51.5)
// Where he stands to shine his flashlight into the Major's office, in its door.
export const LOOK_IN = vec(182, -59)

// The run starts as he leaves the duty desk: out through the door to the hall, west to the back door, east the length
// of the hall to the Major's door, where he shines his light in, and back to his desk, where he sits a while.
export const DESK_TIME = 60
export const LOOK_TIME = 4

export const ROUND: readonly Beat[] = [
  ...walk([160, -50], [160, -58], [134, -58], [181, -58], [LOOK_IN.x, LOOK_IN.z]),
  { wait: LOOK_TIME, face: NORTH },
  ...walk([182, -58], [160, -58], [160, -50], [DESK_AT.x, DESK_AT.z]),
  { wait: DESK_TIME, face: WEST },
]

export const AIRMAN = {
  who: 'The duty airman',
  line: 'Hold it right there. Hands where I can see them.',
  from: DESK_AT,
  speed: 1.2,
  // His flashlight down a dark hall.
  range: 12,
  halfAngle: 0.6,
  // How far the screwdriver carries in the empty building.
  hears: 20,
} as const

const leg = (from: Vec, b: Beat): number => ('to' in b ? distance(from, b.to) / AIRMAN.speed : b.wait)

const legs = (): readonly Readonly<{ from: Vec; beat: Beat; t: number }>[] =>
  ROUND.reduce<readonly Readonly<{ from: Vec; beat: Beat; t: number }>[]>((acc, b) => {
    const last = acc.at(-1)
    const from = last ? ('to' in last.beat ? last.beat.to : last.from) : AIRMAN.from
    return [...acc, { from, beat: b, t: leg(from, b) }]
  }, [])

export const ROUND_TIME = legs().reduce((s, l) => s + l.t, 0)
// The round itself, desk to desk; the rest of the loop he sits.
export const ROUNDS_TIME = ROUND_TIME - DESK_TIME

export type Pose = Readonly<{ at: Vec; facing: number }>

// Where the airman is `clock` seconds into the run, and which way he looks.
export const poseAt = (clock: number): Pose => {
  const c = ((clock % ROUND_TIME) + ROUND_TIME) % ROUND_TIME
  const go = (i: number, facing: number, left: number): Pose => {
    const l = legs()[i]!
    const b = l.beat
    if ('to' in b) {
      const heading = distance(l.from, b.to) > 1e-9 ? angleTo(l.from, b.to) : facing
      if (left >= l.t && i < ROUND.length - 1) return go(i + 1, heading, left - l.t)
      const k = l.t > 0 ? Math.min(1, left / l.t) : 1
      return { at: vec(l.from.x + (b.to.x - l.from.x) * k, l.from.z + (b.to.z - l.from.z) * k), facing: heading }
    }
    if (left >= l.t && i < ROUND.length - 1) return go(i + 1, b.face ?? facing, left - l.t)
    return { at: l.from, facing: b.face ?? facing }
  }
  return go(0, WEST, c)
}

// Whether the airman is out on his round rather than at his desk.
export const onRounds = (clock: number): boolean => ((clock % ROUND_TIME) + ROUND_TIME) % ROUND_TIME < ROUNDS_TIME

const near = (b: Box): boolean =>
  b.x + b.w / 2 > SQUADRON[0] - 4 && b.x - b.w / 2 < SQUADRON[1] + 4 && b.z + b.d / 2 > SQUADRON[2] - 4 && b.z - b.d / 2 < SQUADRON[3] + 4
export const squadronOccluders: readonly Box[] = pieces.filter((p) => p.occludes && near(p.box)).map((p) => p.box)

const inside = (r: Rect, p: Vec, pad = 0): boolean => p.x > r[0] + pad && p.x < r[1] - pad && p.z > r[2] + pad && p.z < r[3] - pad

// Where Wade has no business after hours: the hall and the offices off it, north of the duty desk's wall.
export const HALL_LINE = -56
export const offLimits = (p: Vec): boolean => inside(SQUADRON, p) && p.z < HALL_LINE
export const inOffice = (p: Vec): boolean => inside(MAJORS_OFFICE, p)

export const sees = (clock: number, at: Vec): boolean => {
  const p = poseAt(clock)
  return distance(p.at, at) <= AIRMAN.range && angleBetween(p.facing, angleTo(p.at, at)) <= AIRMAN.halfAngle && lineOfSight(p.at, at, squadronOccluders)
}

// Whether the airman would catch Wade at `at`: his flashlight on him where he has no business, or the screwdriver
// heard from close enough.
export const spotted = (clock: number, at: Vec, prying: boolean): boolean =>
  offLimits(at) && (sees(clock, at) || (prying && distance(poseAt(clock).at, at) <= AIRMAN.hears))

// --- The run ---

export type Dial = readonly [number, number, number]

export type Checkpoint = Readonly<{ at: Vec; facing: number; clock: number; phase: Phase; gotIn?: GotIn }>

export type Cabinet = Readonly<{
  phase: Phase
  // Seconds into the run: the airman walks his round by it. It stops while a menu is open.
  clock: number
  aware: number
  caught?: number
  // Wade has looked at the desk calendar.
  read: boolean
  // The dial's three numbers, and which one his fingers are on.
  dial: Dial
  wheel: number
  // The last try at the handle did not open it.
  stuck?: true
  // He has given up on the dial and has the screwdriver in the seam.
  prying?: true
  gotIn?: GotIn
  pages: number
  checkpoint: Checkpoint
}>

const fresh = (c: Checkpoint, read = false): Cabinet => ({ phase: c.phase, clock: c.clock, aware: 0, read, dial: [0, 0, 0], wheel: 0, gotIn: c.gotIn, pages: 0, checkpoint: c })

// The hall outside the Major's office, where the run starts and its first checkpoint is.
export const HALL_AT = vec(182, -58)
export const HALL_FACING = NORTH
// In front of the open cabinet, the second checkpoint, for a run that starts with it open.
export const AT_CABINET = vec(186, -76.6)

// The run, where the story is at the cabinet: shut where its menu asks how Wade gets in, open where it asks how he gets
// out. Read off the story's place and menu, never a scene id.
export const arrival = (s: State): Readonly<{ at: Vec; facing: number; cabinet: Cabinet }> | undefined => {
  if (place(s) !== 'majorsOffice') return undefined
  const notes = menu(s).options.map((o) => o.note)
  if (notes.includes('combo')) return { at: HALL_AT, facing: HALL_FACING, cabinet: fresh({ at: HALL_AT, facing: HALL_FACING, clock: 0, phase: 'shut' }) }
  if (notes.includes('getOut')) return { at: AT_CABINET, facing: NORTH, cabinet: fresh({ at: AT_CABINET, facing: NORTH, clock: 0, phase: 'open' }) }
  return undefined
}

export const FILL = 0.5
export const DRAIN = 1.2
export const CAUGHT_TIME = 1.8

export const restart = (c: Cabinet): Cabinet => fresh(c.checkpoint, c.read)

// --- The verbs ---

export const look = (c: Cabinet): Cabinet => ({ ...c, read: true })

export type Turn = 'next' | 'up' | 'down' | 'up10' | 'down10'
const BY: Readonly<Record<Exclude<Turn, 'next'>, number>> = { up: 1, down: -1, up10: 10, down10: -10 }

export const turn = (c: Cabinet, t: Turn): Cabinet => {
  if (t === 'next') return { ...c, wheel: (c.wheel + 1) % 3, stuck: undefined }
  const dial = c.dial.map((n, i) => (i === c.wheel ? (((n + BY[t]) % 100) + 100) % 100 : n)) as unknown as Dial
  return { ...c, dial, stuck: undefined }
}

// Whether the handle gives: the circled date, read off the calendar. The same numbers dialed blind do not open it.
export const opens = (c: Cabinet): boolean => c.read && c.dial.every((n, i) => n === COMBINATION[i])

// The cabinet opens, by the code or the screwdriver: the checkpoint before the first page.
export const open = (c: Cabinet, gotIn: GotIn, at: Vec, facing: number): Cabinet => ({
  ...c,
  phase: 'open',
  gotIn,
  prying: undefined,
  stuck: undefined,
  pages: 0,
  checkpoint: { at, facing, clock: c.clock, phase: 'open', gotIn },
})

// A try at the handle: open, or a wrong combination's time gone by.
export type Tried = Readonly<{ cabinet: Cabinet; send?: GotIn }>

export const tryHandle = (c: Cabinet, at: Vec, facing: number): Tried =>
  opens(c) ? { cabinet: open(c, 'combo', at, facing), send: 'combo' } : { cabinet: { ...c, clock: c.clock + WRONG_TIME, stuck: true } }

export const pry = (c: Cabinet): Cabinet => ({ ...c, prying: true })

export const photographed = (c: Cabinet): Cabinet => ({ ...c, pages: Math.min(PAGES, c.pages + 1) })

export const putBack = (c: Cabinet): Cabinet => ({ ...c, phase: 'back' })

// The screwdriver's marks on the drawer seam, from the moment the cabinet is forced.
export const pried = (c: Cabinet | undefined): boolean => c?.gotIn === 'forced'

// The panel at the dial: what the wheels read, the number his fingers are on in brackets.
export const dialText = (c: Cabinet): string => {
  const shown = c.dial.map((n, i) => (i === c.wheel ? `[${String(n).padStart(2, '0')}]` : String(n).padStart(2, '0'))).join('  ')
  return `The combination lock: ${shown}${c.stuck ? '\n\nThe handle doesn\'t give.' : ''}`
}

// What Wade sees bent over the Major's desk under his flashlight. The circled date is on the calendar and nowhere else.
export const DESK_LOOK =
  'A framed photo of a boat. A Florida brochure, dog-eared. The desk calendar is a two-year planner, open at its last page: NOVEMBER 1969. The 1st is circled in red, and across it, in the Major\'s hand: RETIRE.'

// --- One frame ---

export type Step = Readonly<{ cabinet: Cabinet; send?: string }>

// One frame after Wade's step: the clock, the getaway as he steps out of the office with everything back (seen if the
// airman is still on his round), and whether the airman catches him.
export const step = (c: Cabinet, pos: Vec, prying: boolean, dt: number): Step => {
  const clock = c.clock + dt
  if (c.phase === 'back' && !inOffice(pos)) return { cabinet: { ...c, clock }, send: onRounds(clock) ? 'goNow' : 'getOut' }
  const by = spotted(clock, pos, prying)
  const aware = Math.max(0, Math.min(1, c.aware + (by ? dt / FILL : -dt / DRAIN)))
  return { cabinet: { ...c, clock, aware, ...(aware >= 1 && by ? { caught: 0 } : {}) } }
}

export const scold = (c: Cabinet, dt: number): Cabinet | 'busted' => {
  const at = (c.caught ?? 0) + dt
  return at >= CAUGHT_TIME ? 'busted' : { ...c, caught: at }
}

// --- The spots ---

// Which of the office's spots is there to use, while a run is on.
export const cabinetSpot = (c: Cabinet | undefined, id: string): boolean => {
  if (!c) return false
  if (id === DESK_SPOT.id) return c.phase === 'shut'
  if (id === DIAL_SPOT.id) return c.phase === 'shut' && !c.prying
  if (id === PRY_SPOT.id) return c.phase === 'shut' && c.prying === true
  if (id === PAGE_SPOT.id) return c.phase === 'open' && c.pages < PAGES
  if (id === BACK_SPOT.id) return c.phase === 'open' && c.pages >= PAGES
  return false
}

// A held spot's end: what it does to the run, and the note it sends, if any.
export const held = (c: Cabinet, id: string, at: Vec, facing: number): Tried => {
  if (id === PRY_SPOT.id) return { cabinet: open(c, 'forced', at, facing), send: 'forced' }
  if (id === PAGE_SPOT.id) return { cabinet: photographed(c) }
  if (id === BACK_SPOT.id) return { cabinet: putBack(c) }
  return { cabinet: c }
}

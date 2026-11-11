import type { State } from '../../text-game/src/types.ts'
import { mission, place } from '../../text-game/src/story.ts'
import type { Box, Vec } from './world.ts'
import { angleBetween, angleTo, distance, lineOfSight, vec } from './world.ts'
import type { Rect } from './downtown.ts'
import { DRAWERS, LAB, LAB_SPOT, RECORDS, pieces, spawns } from './eielson.ts'

export { DRAWERS }
import { yawOf } from './downtown.ts'

// The photo lab on the base (docs/acts/act2-missions.md, section 1). Wade picks his way in at the counter (the scene's
// own menu: the clerk's lunch, after lockup with a borrowed key, or refuse), and the run starts there: he slips past the
// counter and down the lab hall to the records room, opens the drawers the index card names and searches them, and
// walks out with the prints. The lab's people walk their rounds as data (WATCH): seen where he has no business,
// he is busted and retries from the last checkpoint, and the story never hears of it (Rule 4).
//
// Notes go only at the two moments the story's menus stand for: the way in when Wade steps into the records room
// (a2_photos's note), the drawers when he walks out of it with the prints (the records room's). Everything between is
// the game's own state, `Lab`.

export type Way = 'lunch' | 'key'
export type Method = 'crossCheck' | 'pullAll'
// Getting in, or in the records room (the way in has been sent).
export type Phase = 'in' | 'drawers'

export const WAY_NOTE: Readonly<Record<Way, string>> = { lunch: 'lunch', key: 'afterLockup' }
const WAY_OF: Readonly<Record<string, Way>> = { lunch: 'lunch', afterLockup: 'key' }
const METHODS: readonly string[] = ['crossCheck', 'pullAll'] satisfies readonly Method[]

// How long the drawers take: cross-checking every frame against the map grid, or emptying three drawers into a box.
export const SEARCH_TIME: Readonly<Record<Method, number>> = { crossCheck: 12, pullAll: 4 }

// --- The lab's people, as data ---

// A beat of a round: walk to a point, or stand a while facing a way (or out of the building, unseen and unseeing).
export type Beat = Readonly<{ to: Vec }> | Readonly<{ wait: number; face?: number; away?: true }>

export type Walker = Readonly<{
  id: 'clerk' | 'airman' | 'sergeant'
  who: string
  // What he says when he catches Wade (the busted beat).
  line: string
  from: Vec
  beats: readonly Beat[]
  // A loop runs its beats again from the start; otherwise he stays where the last beat leaves him.
  loop: boolean
  speed: number
  range: number
  halfAngle: number
}>

const NORTH = Math.PI
const WEST = -Math.PI / 2
// From the records room door, the way to the index card's drawers.
const AT_DRAWERS = angleTo(vec(170, 52.6), vec(167, 57))

const walk = (...ps: readonly (readonly [number, number])[]): readonly Beat[] => ps.map(([x, z]) => ({ to: vec(x, z) }))

const leg = (from: Vec, b: Beat, speed: number): number => ('to' in b ? distance(from, b.to) / speed : b.wait)

// How long a run of beats from `from` takes.
const beatsTime = (from: Vec, beats: readonly Beat[], speed: number): number =>
  beats.reduce<Readonly<{ at: Vec; t: number }>>((s, b) => ({ at: 'to' in b ? b.to : s.at, t: s.t + leg(s.at, b, speed) }), { at: from, t: 0 }).t

// At lunch the lab is open and lit. The clerk puts his coat on and goes out the front door at noon, and he comes back
// early, CLERK_BACK seconds into the run: in the door, down the hall to look into the records room, then back behind
// his counter for the afternoon. A lab airman works the darkrooms, and every so often steps out and down the hall to
// the records room door.
export const CLERK_BACK = 95

const CLERK_AT = vec(156, 39)
const CLERK_PACE = 1.3
const toLunch: readonly Beat[] = [{ wait: 2, face: NORTH }, ...walk([164.6, 39.1], [166.5, 36.5], [160.6, 31.2], [160, 29], [160, 12])]

const clerk: Walker = {
  id: 'clerk',
  who: 'The clerk',
  line: 'Airman? You can\'t be back here.',
  from: CLERK_AT,
  beats: [
    ...toLunch,
    { wait: CLERK_BACK - beatsTime(CLERK_AT, toLunch, CLERK_PACE), away: true },
    ...walk([160, 29], [160.6, 31.2], [166.5, 36.5], [165, 39.2], [165, 41], [169.6, 49.5], [170, 52.6]),
    { wait: 4, face: AT_DRAWERS },
    ...walk([169.6, 49.5], [165, 41], [165, 39.2], [156, 39]),
    { wait: 1, face: NORTH },
  ],
  loop: false,
  speed: CLERK_PACE,
  range: 14,
  halfAngle: 0.75,
}

const airman: Walker = {
  id: 'airman',
  who: 'A lab airman',
  line: 'Hey. Who signed you in back here?',
  from: vec(150, 46),
  beats: [{ wait: 30, face: WEST }, ...walk([159.3, 46], [169.6, 49.5], [170, 52.6]), { wait: 3, face: AT_DRAWERS }, ...walk([169.6, 49.5], [159.3, 46], [150, 46])],
  loop: true,
  speed: 1.4,
  range: 14,
  halfAngle: 0.75,
}

// After lockup the lab is dark and empty. The duty sergeant walks his round on the service lane, lets himself in at the
// records room's back door and shines his flashlight along the room, and goes on.
const sergeant: Walker = {
  id: 'sergeant',
  who: 'The duty sergeant',
  line: 'Who\'s in there? Step out where I can see you.',
  from: vec(193, 30),
  beats: [
    { wait: 45, away: true },
    ...walk([193, 61.5], [192, 62], [188.3, 62], [188.3, 55.5]),
    { wait: 5, face: WEST },
    ...walk([188.3, 62], [192, 62], [193, 61.5], [193, 30]),
  ],
  loop: true,
  speed: 1.4,
  // His flashlight reaches the far wall.
  range: 26,
  halfAngle: 0.5,
}

export const WATCH: Readonly<Record<Way, readonly Walker[]>> = { lunch: [clerk, airman], key: [sergeant] }

export const walkers: readonly Walker[] = [clerk, airman, sergeant]

export type Pose = Readonly<{ at: Vec; facing: number; speed: number; away: boolean }>

// How long one pass of a walker's beats takes.
export const roundTime = (w: Walker): number => beatsTime(w.from, w.beats, w.speed)

// Where a walker is `clock` seconds into the run, and which way he looks.
export const poseAt = (w: Walker, clock: number): Pose => {
  const total = roundTime(w)
  const c = w.loop ? ((clock % total) + total) % total : Math.min(Math.max(0, clock), total)
  const go = (i: number, at: Vec, facing: number, left: number): Pose => {
    if (i >= w.beats.length) return { at, facing, speed: 0, away: false }
    const b = w.beats[i]!
    const t = leg(at, b, w.speed)
    if ('to' in b) {
      const heading = distance(at, b.to) > 1e-9 ? angleTo(at, b.to) : facing
      if (left >= t) return go(i + 1, b.to, heading, left - t)
      const k = t > 0 ? left / t : 1
      return { at: vec(at.x + (b.to.x - at.x) * k, at.z + (b.to.z - at.z) * k), facing: heading, speed: w.speed, away: false }
    }
    if (left >= t && i < w.beats.length - 1) return go(i + 1, at, b.face ?? facing, left - t)
    return { at, facing: b.face ?? facing, speed: 0, away: b.away === true }
  }
  return go(0, w.from, NORTH, c)
}

// What blocks a look in and around the lab: its walls and the drawer rows. Only the boxes near the lab, so a look
// tests a few dozen.
const near = (b: Box): boolean => b.x + b.w / 2 > LAB[0] - 8 && b.x - b.w / 2 < LAB[1] + 8 && b.z + b.d / 2 > LAB[2] - 8 && b.z - b.d / 2 < LAB[3] + 8
export const labOccluders: readonly Box[] = pieces.filter((p) => p.occludes && near(p.box)).map((p) => p.box)

export const looks = (w: Walker, p: Pose, at: Vec): boolean =>
  !p.away && distance(p.at, at) <= w.range && angleBetween(p.facing, angleTo(p.at, at)) <= w.halfAngle && lineOfSight(p.at, at, labOccluders)

const inside = (r: Rect, p: Vec, pad = 0): boolean => p.x > r[0] + pad && p.x < r[1] - pad && p.z > r[2] + pad && p.z < r[3] - pad

// Where Wade has no business: at lunch anywhere past the counter, after lockup anywhere in the building.
export const COUNTER_LINE = 38.3
export const offLimits = (way: Way, p: Vec): boolean => inside(LAB, p) && (way === 'key' || p.z > COUNTER_LINE)

// Who would see Wade standing at `at` at `clock`, if anyone: only where he has no business being.
export const spotter = (way: Way, clock: number, at: Vec): Walker | undefined =>
  offLimits(way, at) ? WATCH[way].find((w) => looks(w, poseAt(w, clock), at)) : undefined

// Who looks at where Wade stands, his business there or not: the stealth eye reads it.
export const watching = (way: Way, clock: number, at: Vec): Walker | undefined => WATCH[way].find((w) => looks(w, poseAt(w, clock), at))

// --- The run ---

export type Checkpoint = Readonly<{ at: Vec; facing: number; clock: number; phase: Phase; method?: Method }>

export type Lab = Readonly<{
  way: Way
  phase: Phase
  // Seconds into the run: the lab's people walk their rounds by it. It stops while a menu is open.
  clock: number
  // How much of Wade a watcher has seen, 0 to 1.
  aware: number
  // Seconds into the busted beat, and who caught him.
  caught?: number
  by?: Walker['id']
  method?: Method
  // Seconds of searching done; letting go of the drawers keeps it.
  searched: number
  // The prints are in hand: the drawers' note goes as he walks out of the records room.
  found?: true
  checkpoint: Checkpoint
}>

const fresh = (way: Way, c: Checkpoint): Lab => ({ way, phase: c.phase, clock: c.clock, aware: 0, method: c.method, searched: 0, checkpoint: c })

// The indicator fills in FILL seconds of being seen where he has no business, and empties in DRAIN unseen.
export const FILL = 0.5
export const DRAIN = 1.2
// The busted beat: the watcher's line shows this long before the retry comes up.
export const CAUGHT_TIME = 1.8

export const wayOf = (s: State): Way => (s.photoLab === 'key' ? 'key' : 'lunch')

// The run starts at the counter, once Wade picks his way in.
export const begin = (way: Way, at: Vec, facing: number): Lab => fresh(way, { at, facing, clock: 0, phase: 'in' })

// Arriving straight in the records room (a link to its scene): the run starts at its door.
export const arrival = (s: State, at: Vec, facing: number): Lab | undefined =>
  place(s) === 'photoRecords' ? fresh(wayOf(s), { at, facing, clock: 0, phase: 'drawers' }) : undefined

// What a menu's note does in the run, if it is the run's: the way in starts it at the counter (no note goes yet); the
// drawers' method is picked with them open, the checkpoint before the first print is pulled. Anything else (refusing)
// is the story's.
export const pick = (s: State, lab: Lab | undefined, note: string, at: Vec, facing: number): Lab | undefined => {
  if (!lab && mission(s)?.id === 'thePhotoLab' && WAY_OF[note]) return begin(WAY_OF[note]!, at, facing)
  if (lab?.phase === 'drawers' && !lab.found && place(s) === 'photoRecords' && METHODS.includes(note)) {
    const method = note as Method
    return { ...lab, method, searched: 0, checkpoint: { at, facing, clock: lab.clock, phase: 'drawers', method } }
  }
  return undefined
}

// Busted: back to the last checkpoint, the lab's people where they were then.
export const restart = (lab: Lab): Lab => fresh(lab.way, lab.checkpoint)

export const found = (lab: Lab): Lab => ({ ...lab, searched: lab.method ? SEARCH_TIME[lab.method] : lab.searched, found: true })

export const searchTime = (lab: Lab): number => (lab.method ? SEARCH_TIME[lab.method] : 0)

// One frame of the run after Wade's step: the clock, the doors he crosses (the way in at the records room door, out of
// it with the prints), and whether anyone sees him.
export type Step = Readonly<{ lab: Lab; send?: string }>

export const step = (lab: Lab, pos: Vec, facing: number, holding: Readonly<{ id: string; progress: number }> | undefined, dt: number): Step => {
  const clock = lab.clock + dt
  const searched = holding?.id === DRAWERS.id ? holding.progress : lab.searched
  if (lab.phase === 'in' && inside(RECORDS, pos, 0.4)) {
    return { lab: { ...lab, clock, phase: 'drawers', checkpoint: { at: pos, facing, clock, phase: 'drawers' } }, send: WAY_NOTE[lab.way] }
  }
  if (lab.found && lab.method && !inside(RECORDS, pos, -0.4)) return { lab: { ...lab, clock }, send: lab.method }
  const by = spotter(lab.way, clock, pos)
  const aware = Math.max(0, Math.min(1, lab.aware + (by ? dt / FILL : -dt / DRAIN)))
  return { lab: { ...lab, clock, searched, aware, ...(aware >= 1 && by ? { caught: 0, by: by.id } : {}) } }
}

// The busted beat runs; at its end the retry comes up.
export const scold = (lab: Lab, dt: number): Lab | 'busted' => {
  const at = (lab.caught ?? 0) + dt
  return at >= CAUGHT_TIME ? 'busted' : { ...lab, caught: at }
}

export const catcher = (lab: Lab): Walker => walkers.find((w) => w.id === lab.by) ?? WATCH[lab.way][0]!

// The way to the records room is there to use only where the story's photo lab mission starts, before Wade has picked
// his way in; the drawers in the records room until the prints are in hand.
export const labSpot = (s: State, lab: Lab | undefined, id: string): boolean => {
  if (id === LAB_SPOT.id) return mission(s)?.id === 'thePhotoLab' && !lab
  if (id === DRAWERS.id) return place(s) === 'photoRecords' && lab !== undefined && !lab.found
  return false
}

// Pulling everything leaves its mess: the three drawers hang open and prints are on the floor from the first pull on.
export const messy = (lab: Lab | undefined, holding?: Readonly<{ id: string }>): boolean =>
  lab?.method === 'pullAll' && (lab.found === true || lab.searched > 0 || holding?.id === DRAWERS.id)

// The lab's people to draw, while a run is on.
export type Figure = Readonly<{ id: Walker['id']; pose: Pose }>

export const figuresOf = (lab: Lab | undefined): readonly Figure[] =>
  lab ? WATCH[lab.way].map((w) => ({ id: w.id, pose: poseAt(w, lab.clock) })).filter((f) => !f.pose.away) : []

// Where Wade stands at the story's place on the base: its spawn on the base map, facing the way it faces.
export const baseEntry = (s: State): Readonly<{ at: Vec; facing: number }> => {
  const p = spawns.find((x) => x.id === place(s))
  if (!p) throw new Error(`no base spawn for ${s.scene}`)
  return { at: vec(p.x, p.z), facing: yawOf(p.facing) }
}

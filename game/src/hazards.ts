import type { SceneId, State } from '../../text-game/src/types.ts'
import type { Bit } from '../../text-game/src/ambient/format.ts'
import type { Spent } from '../../text-game/src/ambient/select.ts'
import { present, say, within } from '../../text-game/src/ambient/select.ts'
import { floodTown } from '../../text-game/src/ambient/floodTown.ts'
import { replay } from '../../text-game/src/engine.ts'
import type { Prop } from './levels.ts'
import type { Game } from './prologue.ts'
import type { Box, Vec } from './world.ts'
import { RADIUS, add, distance, length, move, normalize, scale, sub, vec } from './world.ts'
import { avenues, streets } from './downtown.ts'
import { WATER_Y, depthAt } from './highwater.ts'
import { FROM_TENT, LEGS, wadePace } from './trail.ts'
import { drift, takesFeet } from './current.ts'

// The flood as texture on the search for Eli (issue #229, docs/acts/act1-missions.md, section 1): what is under the
// water, what comes down the street on it, and the neighbors who call out from their porches and roofs. It slows and
// complicates the search and is never its goal. The one fail is still the river (current.ts): past his waist in the
// moving water, the current takes Wade's feet, the screen fades, and he is back at the last checkpoint. A fail never
// reaches the story (Rule 4): nothing here returns a State, and a retry keeps the story and its path as they were.
//
// Every hazard stands off the trail's own walks (trail.ts, LEGS), so a player who walks where the townspeople point
// never meets one by accident; they are what a player finds by wading off the way.

// What is under the water: a manhole lid the water lifted off on Second, and the Ptarmigan's sidewalk cellar doors,
// open, on Cushman's east walk north of the corner. Over one the water is deeper by its drop; the surface swirls over
// it, the only tell. On Second that is a stumble to the chest; north of Second it is past the waist in moving water.
export type Hole = Readonly<{ id: string; at: Vec; r: number; drop: number }>

export const HOLES: readonly Hole[] = [
  { id: 'manhole', at: vec(24, 58), r: 0.45, drop: 0.6 },
  { id: 'cellar', at: vec(6, 40), r: 0.7, drop: 0.9 },
]

export const depthOver = (p: Vec): number => depthAt(p.z) + HOLES.filter((h) => distance(p, h.at) < h.r).reduce((sum, h) => sum + h.drop, 0)

// Wading pace over the street with what is under it (trail.ts, wadePace). A deck he stands on is dry.
export const paceThrough = (p: Vec, raised: number): number => (raised > 0 ? 1 : wadePace(depthOver(p)))

// The swirl over each hole, a shade darker than the water around it.
export const swirls: readonly Prop[] = HOLES.map((h) => ({
  box: { x: h.at.x, z: h.at.z, w: h.r * 2.4, d: h.r * 2.4 },
  h: 0.03,
  y: WATER_Y - 0.02,
  color: '#4a3c2c',
  flat: true,
  shape: 'cylinder',
}))

// What comes down the street: on First Avenue the river's own load, fast, in water past a man's head; on Second, what
// the water lifted out of the stores, creeping west in the standing water. Each piece drifts west along its lane from
// `from` to `to` and starts over; one that meets Wade shoves him along with it and aside. It never takes his feet:
// only the current does.
export type Lane = Readonly<{ z: number; from: number; to: number; speed: number }>

const FIRST_ROAD = avenues.find((a) => a.name === 'First Avenue')!.road
const SECOND_ROAD = avenues.find((a) => a.name === 'Second Avenue')!.road

export const LANES = {
  first: { z: (FIRST_ROAD[0] + FIRST_ROAD[1]) / 2, from: 160, to: -50, speed: 1.2 },
  // The north half of Second's roadway, east of Cushman, clear of the walk the trail takes along it.
  second: { z: SECOND_ROAD[0] + 1.4, from: 70, to: 10, speed: 0.35 },
} as const satisfies Readonly<Record<string, Lane>>

export type Debris = Readonly<{ id: string; lane: keyof typeof LANES; r: number; w: number; d: number; h: number; color: string; shape: 'box' | 'cylinder'; lead: number }>

// `lead`: how far down its lane a piece has come at the start, so a lane's pieces go by apart.
export const DEBRIS: readonly Debris[] = [
  { id: 'drum', lane: 'second', r: 0.32, w: 0.6, d: 0.6, h: 0.5, color: '#6a4030', shape: 'cylinder', lead: 4 },
  { id: 'door', lane: 'second', r: 0.7, w: 0.8, d: 1.9, h: 0.06, color: '#8a7656', shape: 'box', lead: 24 },
  { id: 'crate', lane: 'second', r: 0.4, w: 0.7, d: 0.6, h: 0.4, color: '#9a8458', shape: 'box', lead: 44 },
  { id: 'log', lane: 'first', r: 0.5, w: 4.5, d: 0.5, h: 0.4, color: '#5e4a36', shape: 'box', lead: 0 },
  { id: 'shed', lane: 'first', r: 1.2, w: 2.4, d: 2.0, h: 0.9, color: '#7a6248', shape: 'box', lead: 70 },
  { id: 'firstDrum', lane: 'first', r: 0.32, w: 0.6, d: 0.6, h: 0.5, color: '#4e5a66', shape: 'cylinder', lead: 140 },
]

const span = (l: Lane): number => l.from - l.to

// Where a piece is at t seconds since the space opened.
export const debrisAt = (d: Debris, t: number): Vec => {
  const l = LANES[d.lane]
  const gone = (((d.lead + t * l.speed) % span(l)) + span(l)) % span(l)
  return vec(l.from - gone, l.z)
}

// How far up out of the water a piece rides, 1 afloat, 0 under: it comes up out of the brown at the head of its lane
// and goes under at the foot, over its last two meters, so a piece starting over is never seen to jump.
export const SINK = 2

export const afloat = (d: Debris, t: number): number => {
  const l = LANES[d.lane]
  const x = debrisAt(d, t).x
  return Math.max(0, Math.min(1, (x - l.to) / SINK, (l.from - x) / SINK))
}

const flow = (d: Debris): Vec => vec(-LANES[d.lane].speed, 0)

// The piece Wade is touching at t, if any.
export const touching = (p: Vec, t: number): Debris | undefined => DEBRIS.find((d) => distance(p, debrisAt(d, t)) < d.r + RADIUS)

// A piece that meets Wade carries him with it for the tick and puts him back at arm's length from it.
export const shove = (p: Vec, t: number, dt: number, boxes: readonly Box[]): Vec => {
  const d = touching(p, t)
  if (!d) return p
  const at = debrisAt(d, t)
  const away = normalize(sub(p, at))
  const out = length(away) > 0 ? away : vec(0, 1)
  const clear = add(at, scale(out, d.r + RADIUS))
  const want = add(sub(clear, p), scale(flow(d), dt))
  return length(want) > 0 ? move(p, want, length(want), boxes) : p
}

// The checkpoints (section 1): stepping off the line; the mattress set on the porch roof; the porch, before the slip;
// the help tent, with the slip handed over and the envelope in his hand; finding the boat, at Third or at Fifth. Each
// is where Wade stands at that stop on the trail's walks, facing the way he goes on. Which one is last is read off
// the story: the scene it stands at now, and for the boat, which scene found it.
export type Checkpoint = Readonly<{ at: Vec; facing: number }>

const end = (points: readonly (readonly [number, number])[]): Vec => {
  const [x, z] = points.at(-1)!
  return vec(x, z)
}

const NORTH = Math.PI
const EAST = Math.PI / 2
const SOUTH = 0

export const CHECKPOINTS = {
  offLine: { at: vec(LEGS.toMattress[0][0], LEGS.toMattress[0][1]), facing: NORTH },
  mattress: { at: end(LEGS.toMattress), facing: EAST },
  porch: { at: end(LEGS.toPorch), facing: SOUTH },
  tent: { at: FROM_TENT, facing: NORTH },
  boatThird: { at: end(LEGS.toBoat), facing: NORTH },
  boatFifth: { at: end(LEGS.toFifth), facing: NORTH },
} as const satisfies Readonly<Record<string, Checkpoint>>

export type CheckpointId = keyof typeof CHECKPOINTS

// The story's scene, while Wade is out on the trail toward its stop, and the checkpoint behind him. Once he has found
// the boat, which one it was is read off the path: the boat scene it played.
const behind: Readonly<Partial<Record<SceneId, CheckpointId | 'boat'>>> = {
  a1_flood: 'offLine',
  a1_track: 'offLine',
  a1_track_2: 'mattress',
  a1_couple: 'mattress',
  a1_eli: 'porch',
  a1_errand: 'porch',
  a1_trail: 'tent',
  a1_delivered: 'boat',
  a1_line: 'boat',
}

const boats: Readonly<Partial<Record<SceneId, CheckpointId>>> = { a1_eli: 'boatThird', a1_trail: 'boatFifth' }

const memo = new WeakMap<readonly number[], CheckpointId>()

const boatFound = (path: readonly number[]): CheckpointId => {
  const hit = memo.get(path)
  if (hit) return hit
  const states = (() => {
    try {
      return replay(path)
    } catch {
      return []
    }
  })()
  const id = states.map((s) => boats[s.scene]).findLast((b) => b !== undefined) ?? 'boatThird'
  memo.set(path, id)
  return id
}

export const lastCheckpoint = (s: State, path: readonly number[]): CheckpointId => {
  const c = behind[s.scene] ?? 'offLine'
  return c === 'boat' ? boatFound(path) : c
}

// The current: how long the fade runs once it has his feet, and how dark it is so far.
export const SWEEP = 1.2

export const sweepFade = (swept: number | undefined): number => (swept === undefined ? 0 : Math.min(1, swept / SWEEP))

// Back at the last checkpoint, standing, with nothing in his hands but what he carried there. The story, its path,
// and everything the story counts are as they were; busts counts the retry so the camera settles behind him again.
export const retry = (g: Game): Game => {
  const c = CHECKPOINTS[lastCheckpoint(g.story, g.path)]
  return { ...g, swept: undefined, holding: undefined, pos: c.at, facing: c.facing, view: c.facing, vel: vec(0, 0), busts: g.busts + 1 }
}

// One tick of the water on Wade wading the flooded town, after he has moved: raised is the deck under him, if any,
// and boxes the space's solids. While the current has him, the fade runs and then he is at the checkpoint.
export const wash = (g: Game, dt: number, raised: number, boxes: readonly Box[]): Game => {
  if (g.swept !== undefined) {
    const swept = g.swept + dt
    return swept < SWEEP ? { ...g, swept, vel: vec(0, 0) } : retry(g)
  }
  if (takesFeet(g.pos, depthOver(g.pos), raised)) return { ...g, swept: 0, holding: undefined, vel: vec(0, 0) }
  const push = scale(drift(g.pos, depthOver(g.pos), raised), dt)
  const pushed = length(push) > 0 ? move(g.pos, push, length(push), boxes) : g.pos
  const pos = raised > 0 ? pushed : shove(pushed, g.t, dt, boxes)
  return pos === g.pos ? g : { ...g, pos }
}

// The neighbors. Who is out on a stretch of the flooded town, and what they call, is the story's (floodTown.ts,
// issue #107), through select.ts; nothing here writes a line. `stretchAt` says which of the town map's stretches Wade
// is on, by the spot names the story's windows carry.
export type Stretch = 'firstAvenue' | 'secondAvenue' | 'cushman' | 'lacey' | 'boardingHouse'

const inRow = (v: number, [a, b]: readonly [number, number]): boolean => v >= a && v <= b
const avenue = (name: string) => avenues.find((a) => a.name === name)!.row
const street = (name: string) => streets.find((s) => s.name === name)!.row

export const stretchAt = (p: Vec): Stretch | undefined => {
  if (inRow(p.z, avenue('First Avenue'))) return 'firstAvenue'
  if (inRow(p.z, avenue('Second Avenue'))) return 'secondAvenue'
  if (inRow(p.x, street('Cushman Street'))) return 'cushman'
  if (inRow(p.x, street('Lacey Street'))) return 'lacey'
  if (inRow(p.z, avenue('Third Avenue')) && inRow(p.x, [118, 154])) return 'boardingHouse'
  return undefined
}

// What a neighbor on Wade's stretch calls out now, as debris goes by or the water knocks him about: the first of
// them out there with a bark the story has for this moment, and the lines said so far.
export const callOut = (s: State, p: Vec, spent: Spent): Readonly<{ who: string; bit: Bit; spent: Spent }> | undefined => {
  const stretch = stretchAt(p)
  if (!stretch) return undefined
  const out = present(s, floodTown).filter((a) => a.at.some((w) => w.spot === stretch && within(s)(w)))
  return out.reduce<Readonly<{ who: string; bit: Bit; spent: Spent }> | undefined>((found, a) => {
    if (found) return found
    const said = say(s, a, 'bark', spent)
    return said ? { who: a.id, ...said } : undefined
  }, undefined)
}

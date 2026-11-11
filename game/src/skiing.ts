import { menu } from '../../text-game/src/story.ts'
import { before } from './trail.ts'
import type { Prop, Space } from './levels.ts'
import type { Body, Exposure } from './survival.ts'
import { FREEZE_LIMIT, expose, fresh, pace } from './survival.ts'
import type { Box, Vec } from './world.ts'
import { angleBetween, angleTo, distance, length, move, vec } from './world.ts'

// Wade on skis: the ski search (docs/acts/act3-missions.md, section 3; issue #141). A locomotion mode, not a new
// character: the same player, the same camera and the same input, moved by these rules instead of walking.
//
// Downhill is a water-skier's balance: gravity does the work, he steers well and never falls. On the flats the skis
// only go with kick and glide, a rhythm he can't find: a kick in its window carries him on, a kick too soon makes him
// stagger, and another while he staggers puts him on his face. Holding forward without a rhythm is a slow, safe
// shuffle, so a player is never stuck. Climbing is slow
// sidestep and herringbone, and it makes him sweat; the sweat freezes, which is the survival rules' wet (survival.ts).
//
// Nothing here knows the story but the route: the mission's note is the route the player took (ridge or creek), sent
// as the scenes' own notes on the way (story-api.md, Rules 1 to 4). Every number below is this module's own tuning.

// --- The ground ------------------------------------------------------------------------------------------------------

// A route on the slope as points of [x, z, height], world coordinates (x east, z south), heights in meters.
export type Point = readonly [number, number, number]

export type RouteId = 'ridge' | 'creek'

// The ridge: a long run down off the ridge, then the flats to the slope above the wreck. The creek: straight up the
// drainage to the same spot. Each route starts where the team split and Wade set off alone that way.
export const ROUTES: Readonly<Record<RouteId, readonly Point[]>> = {
  ridge: [[-40, 40, 26], [-40, -30, 4], [-35, -60, 0], [-15, -105, 0], [0, -140, 0]],
  creek: [[30, -20, -30], [20, -90, -10], [0, -140, 0]],
}

// The top of the slope above the wreck, where both routes end, and the wreck below it in the spruce.
export const SLOPE_TOP = vec(0, -140)
export const WRECK = vec(0, -175)
const DROP: readonly Point[] = [[SLOPE_TOP.x, SLOPE_TOP.z, 0], [WRECK.x, WRECK.z, -14]]

// How close to the top of the slope ends the search.
export const ARRIVE = 4

const lines: readonly (readonly Point[])[] = [ROUTES.ridge, ROUTES.creek, DROP]

// The nearest point on a route: its distance and the route's height there.
const nearest = (line: readonly Point[], p: Vec): Readonly<{ d: number; h: number }> =>
  line.slice(1).reduce(
    (best, b, i) => {
      const a = line[i]!
      const [ax, az, ah] = a
      const [bx, bz, bh] = b
      const lx = bx - ax
      const lz = bz - az
      const t = Math.max(0, Math.min(1, ((p.x - ax) * lx + (p.z - az) * lz) / (lx * lx + lz * lz)))
      const d = Math.hypot(p.x - (ax + lx * t), p.z - (az + lz * t))
      return d < best.d ? { d, h: ah + (bh - ah) * t } : best
    },
    { d: Infinity, h: 0 },
  )

// The ground's height: each route's own height near it, blended by distance between them, so the routes are the
// slope's shape and the ground between them is smooth.
const SOFT = 1

export const heightAt = (p: Vec): number => {
  const near = lines.map((l) => nearest(l, p))
  const w = near.map((n) => 1 / (n.d * n.d + SOFT))
  const total = w.reduce((a, b) => a + b, 0)
  return near.reduce((sum, n, i) => sum + n.h * w[i]!, 0) / total
}

export const ahead = (facing: number): Vec => vec(Math.sin(facing), Math.cos(facing))

// The grade along a heading: rise over run, positive uphill.
export const gradeAt = (p: Vec, facing: number): number => {
  const a = ahead(facing)
  const half = 0.5
  return heightAt(vec(p.x + a.x * half, p.z + a.z * half)) - heightAt(vec(p.x - a.x * half, p.z - a.z * half))
}

export type Terrain = 'down' | 'flat' | 'up'

// Steeper than this either way is a hill; between, the skis are on the flat.
export const HILL = 0.06

export const terrainOf = (grade: number): Terrain => (grade < -HILL ? 'down' : grade > HILL ? 'up' : 'flat')

// --- The skier -------------------------------------------------------------------------------------------------------

// What the skis carry from frame to frame. `speed` is along `facing`; `pushed` is whether the stick or key was held
// forward last frame (kicks are its rising edges); `since` is seconds since the last kick; `down` is seconds left on
// the ground after a fall; `sweat` runs 0 to 1; `wobble` is seconds left of a stagger after a kick too soon. `falls`
// counts them, for the tests and the sound.
export type Ski = Readonly<{
  route: RouteId
  speed: number
  pushed: boolean
  since: number
  down: number
  sweat: number
  wobble: number
  falls: number
  body: Body
}>

export type Skier = Readonly<{ pos: Vec; facing: number; ski: Ski }>

export const startOf = (route: RouteId): Readonly<{ at: Vec; facing: number }> => {
  const [a, b] = ROUTES[route] as readonly [Point, Point]
  const at = vec(a[0], a[1])
  return { at, facing: angleTo(at, vec(b[0], b[1])) }
}

export const setOff = (route: RouteId, body: Body = fresh): Skier => {
  const s = startOf(route)
  return { pos: s.at, facing: s.facing, ski: { route, speed: 0, pushed: false, since: Infinity, down: 0, sweat: 0, wobble: 0, falls: 0, body } }
}

// Gravity, and the snow's drag on the bases and the air's on Wade.
export const G = 9.8
export const MU = 0.05
export const AIR = 0.012

// Downhill: as fast as he dares, and he dares; a snowplow when he pulls back.
export const DOWN_MAX = 10
export const BRAKE = 4
export const BRAKE_ANGLE = 2.2

// The flats. Holding forward is a shuffle. A kick is a fresh push forward: inside the window after the last kick it
// adds KICK; sooner than the window opens and he staggers, and a second too-soon kick while he staggers falls him; later, the glide is gone and the kick is a weak one, never a
// fall, so a slow deliberate rhythm is always safe. On a stick a push is past PRESS and let go below RELEASE, so a
// thumb resting on it does not kick.
// The flats also drag on speed in proportion to it (soft snow, a poor glide), so the run off the ridge dies on them.
export const FLAT_DRAG = 0.25
export const SHUFFLE = 1.1
export const SHUFFLE_ACCEL = 2
export const KICK = 1.4
export const LATE_KICK = 0.5
export const KICK_MAX = 3.6
export const WINDOW_OPEN = 0.5
export const WINDOW_CLOSE = 0.8
export const PRESS = 0.6
export const RELEASE = 0.3

// A stagger lasts this long; a good kick steadies him at once.
export const WOBBLE = 1.2

// Down for this long after a fall; then up where he fell, facing the same way.
export const GET_UP = 1.2

// Climbing: sidestep and herringbone, slow; the edges hold when he stops pushing, so he never slides back.
export const CLIMB = 1.2
export const CLIMB_ACCEL = 3
export const EDGE_HOLD = 4

// Sweat: wet through after SWEAT_IN seconds of climbing; it takes SWEAT_OUT seconds to freeze off once he stops.
// Wet from WET on.
export const SWEAT_IN = 20
export const SWEAT_OUT = 120
export const WET = 0.25

// How fast he can turn: his balance downhill, less on the flats, least sidestepping up; a step turn when stopped.
export const TURN: Readonly<Record<Terrain, number>> = { down: 2.6, flat: 1.6, up: 1.2 }
export const STEP_TURN = 2
const SLOW = 0.3

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

const toward = (v: number, to: number, rate: number): number => (v < to ? Math.min(to, v + rate) : Math.max(to, v - rate))

const turnTo = (from: number, to: number, rate: number): number => {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + clamp(d, -rate, rate)
}

// The kick, read off the push: a rising edge past PRESS, held until it drops below RELEASE.
export const pushing = (was: boolean, push: number): boolean => (was ? push > RELEASE : push > PRESS)

export type Kick = 'none' | 'good' | 'late' | 'early'

// Whether a fresh push on the flats is a good kick, a late one, or too early (a fall).
export const kickOf = (since: number): Exclude<Kick, 'none'> => (since < WINDOW_OPEN ? 'early' : since <= WINDOW_CLOSE ? 'good' : 'late')

// The speed after a frame on the flats: the glide runs down, a held push shuffles, a kick adds speed.
const flats = (speed: number, kick: Kick, held: boolean, k: number, grade: number, dt: number): number => {
  const glided = Math.max(0, speed - (G * (MU + grade) + FLAT_DRAG * speed) * dt)
  const shuffled = held && glided < SHUFFLE * k ? Math.min(SHUFFLE * k, glided + SHUFFLE_ACCEL * dt) : glided
  if (kick === 'good') return Math.min(KICK_MAX * k, shuffled + KICK * k)
  if (kick === 'late') return Math.min(KICK_MAX * k, Math.max(shuffled, SHUFFLE * k) + LATE_KICK * k)
  return shuffled
}

const downhill = (speed: number, braking: boolean, grade: number, dt: number): number =>
  clamp(speed + (G * (-grade - MU) - AIR * speed * speed - (braking ? BRAKE : 0)) * dt, 0, DOWN_MAX)

const uphill = (speed: number, held: boolean, k: number, grade: number, dt: number): number =>
  speed > CLIMB * k ? Math.max(CLIMB * k, speed - G * (grade + MU) * dt) : held ? toward(speed, CLIMB * k, CLIMB_ACCEL * dt) : toward(speed, 0, EDGE_HOLD * dt)

// What the slope does to his body this moment (survival.ts): always in the open; standing still when stopped or down;
// wet once the sweat is through.
export const exposureOf = (s: Ski): Exposure => ({ open: true, wind: false, still: s.speed < SLOW, mittsOff: false, wet: s.sweat >= WET })

// One frame on skis. `dir` is the player's wanted direction in the world (the walk's input), its length the push.
export const glide = (sk: Skier, dir: Vec, dt: number, blocks: readonly Box[] = []): Skier => {
  const s = sk.ski
  const body = expose(s.body, exposureOf(s), dt)
  if (s.down > 0) return { ...sk, ski: { ...s, body, down: Math.max(0, s.down - dt), speed: 0, pushed: false, since: Infinity } }
  const push = Math.min(1, length(dir))
  const wanted = push > 0 ? angleTo(vec(0, 0), dir) : sk.facing
  const held = pushing(s.pushed, push)
  const fresh = held && !s.pushed
  const k = pace(body)
  const grade = gradeAt(sk.pos, sk.facing)
  const ground = terrainOf(grade)
  const braking = push > 0 && s.speed > SLOW && angleBetween(sk.facing, wanted) > BRAKE_ANGLE
  const kick: Kick = fresh && ground === 'flat' ? kickOf(s.since) : 'none'
  if (kick === 'early' && s.wobble > 0) return { ...sk, ski: { ...s, body, speed: 0, pushed: held, since: Infinity, down: GET_UP, wobble: 0, falls: s.falls + 1 } }
  const wobble = kick === 'early' ? WOBBLE : kick === 'good' ? 0 : Math.max(0, s.wobble - dt)
  const rate = s.speed < SLOW ? STEP_TURN : TURN[ground]
  const facing = push > 0 && !braking ? turnTo(sk.facing, wanted, rate * dt) : sk.facing
  const speed = ground === 'down' ? downhill(s.speed, braking, grade, dt) : ground === 'up' ? uphill(s.speed, held, k, grade, dt) : flats(s.speed, kick, held, k, grade, dt)
  const climbing = ground === 'up' && held && speed > SLOW / 2
  const sweat = climbing ? Math.min(1, s.sweat + dt / SWEAT_IN) : Math.max(0, s.sweat - dt / SWEAT_OUT)
  const go = speed * dt
  const a = ahead(facing)
  const pos = go > 0 ? move(sk.pos, a, go, blocks) : sk.pos
  const moved = distance(pos, sk.pos)
  return {
    pos,
    facing,
    ski: { ...s, body, speed: go > 0 && moved < go * 0.5 ? moved / dt : speed, pushed: held, since: fresh ? 0 : s.since + dt, sweat, wobble },
  }
}

export const fallen = (s: Ski): boolean => s.down > 0

export const staggering = (s: Ski): boolean => s.wobble > 0

// Frozen too long on the slope: back to where the team split, the route the same, the body fresh (survival.ts,
// "Fail and retry"). The story never hears of it.
export const froze = (s: Ski): boolean => s.body.freezing >= FREEZE_LIMIT

export const arrived = (p: Vec): boolean => distance(p, SLOPE_TOP) <= ARRIVE

// --- The story -------------------------------------------------------------------------------------------------------

// The prompt at a3_search, by route: the note that chooses it (missions.ts, theSkiSearch).
export const ROUTE_NOTES: Readonly<Record<RouteId, string>> = { ridge: 'downhill', creek: 'climb' }

// The route the player is on: the one whose note was the last choice on the path, so the story is between the prompt
// and the top of the slope. Read off the path, never a scene id (the game picks by the story's queries).
export const routeOf = (path: readonly number[]): RouteId | undefined => {
  const prior = before(path)
  const note = prior && menu(prior).options.find((o) => o.n === path.at(-1))?.note
  return (Object.keys(ROUTE_NOTES) as RouteId[]).find((r) => ROUTE_NOTES[r] === note)
}

// Reaching the top of the slope is the scene's `follow`: the story moves on to a3_arm (missions.ts, theSkiSearch).
export const ARRIVE_NOTE = 'follow'

// --- The controller's side -------------------------------------------------------------------------------------------

// What the controller needs each frame (prologue.ts carries `pos`, `facing` and `vel`, and would carry `ski`): the
// skier after the frame, its velocity for the body's animation and the footsteps, and what happened. On 'arrived' the
// controller sends ARRIVE_NOTE; on 'froze' it fades and puts him back where the team split (the skier returned is
// already there). Neither failure reaches the story.
export type Outcome = 'skiing' | 'arrived' | 'froze'

export const velOf = (sk: Skier): Vec => {
  const a = ahead(sk.facing)
  return vec(a.x * sk.ski.speed, a.z * sk.ski.speed)
}

export const skiFrame = (sk: Skier, dir: Vec, dt: number, blocks: readonly Box[] = []): Readonly<{ skier: Skier; vel: Vec; outcome: Outcome }> => {
  const next = glide(sk, dir, dt, blocks)
  if (froze(next.ski)) {
    const back = setOff(next.ski.route)
    return { skier: back, vel: vec(0, 0), outcome: 'froze' }
  }
  return { skier: next, vel: velOf(next), outcome: arrived(next.pos) ? 'arrived' : 'skiing' }
}

// How high his feet are on the slope: the ground under him (prologue.ts, footY).
export const skiFootY = (sk: Skier): number => heightAt(sk.pos)

// --- The space -------------------------------------------------------------------------------------------------------

const SPRUCE = '#2f3d30'
const TRUNK = '#4a3a2c'

// Black spruce either side of each route, every SPACING meters, OFFSET to the side; deterministic.
const SPACING = 11
const OFFSET = 8

const spruce = (x: number, z: number, tall: number): readonly Prop[] => {
  const y = heightAt(vec(x, z))
  return [
    { box: { x, z, w: 0.35, d: 0.35 }, h: 1.2, y: y - 0.2, color: TRUNK, solid: true },
    { box: { x, z, w: 1.8, d: 1.8 }, h: tall, y: y + 0.6, color: SPRUCE, shape: 'cone' },
  ]
}

const sides = (line: readonly Point[]): readonly Prop[] =>
  line.slice(1).flatMap((b, i) => {
    const a = line[i]!
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const nx = -(b[1] - a[1]) / len
    const nz = (b[0] - a[0]) / len
    return Array.from({ length: Math.floor(len / SPACING) }, (_, j) => {
      const t = (j + 0.5) / Math.floor(len / SPACING)
      const x = a[0] + (b[0] - a[0]) * t
      const z = a[1] + (b[1] - a[1]) * t
      const side = j % 2 === 0 ? 1 : -1
      const off = OFFSET + ((j * 7 + i * 3) % 5)
      return spruce(x + nx * off * side, z + nz * off * side, 4 + ((j * 3 + i) % 4))
    }).flat()
  })

// The wreck in its stand of spruce below the top of the slope: the fuselage on its side, a wing up. Drawn rough;
// the wreck mission (section 4) is its own.
const wreckY = heightAt(WRECK)

const wreck: readonly Prop[] = [
  { box: { x: WRECK.x, z: WRECK.z, w: 1.6, d: 7 }, h: 1.5, y: wreckY, color: '#8c8f88', solid: true },
  { box: { x: WRECK.x + 2.5, z: WRECK.z - 1, w: 5, d: 1.4 }, h: 0.15, y: wreckY + 1.6, color: '#7a7d76' },
  ...spruce(WRECK.x - 6, WRECK.z + 3, 6),
  ...spruce(WRECK.x + 7, WRECK.z - 4, 7),
  ...spruce(WRECK.x - 4, WRECK.z - 8, 5),
]

export const SIZE = { w: 180, d: 260 } as const
export const CENTER = vec(5, -65)

const edge = (x: number, z: number, w: number, d: number): Prop => ({ box: { x, z, w, d }, h: 0.01, color: '#000000', solid: true })

const bounds: readonly Prop[] = [
  edge(CENTER.x, CENTER.z - SIZE.d / 2 - 0.5, SIZE.w + 2, 1),
  edge(CENTER.x, CENTER.z + SIZE.d / 2 + 0.5, SIZE.w + 2, 1),
  edge(CENTER.x - SIZE.w / 2 - 0.5, CENTER.z, 1, SIZE.d + 2),
  edge(CENTER.x + SIZE.w / 2 + 0.5, CENTER.z, 1, SIZE.d + 2),
]

// The search's space, everything but its id: levels.ts adds it as `search: { id: 'search', ...searchSpace }` once the
// space id is added to SpaceId, and render.ts draws its ground with skiView.ts (buildSlope) instead of the flat box.
export const searchSpace: Omit<Space, 'id'> = {
  act: 'Act 3: Deep Winter',
  place: 'searchRidge',
  name: 'The search',
  size: SIZE,
  center: CENTER,
  interior: false,
  ground: '#e9edf1',
  spawn: startOf('ridge').at,
  props: [...bounds, ...sides(ROUTES.ridge), ...sides(ROUTES.creek), ...wreck],
  figures: [],
  spots: [],
}

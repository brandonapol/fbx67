import type { State } from '../../text-game/src/types.ts'
import type { Ambient, Window } from '../../text-game/src/ambient/format.ts'
import { present, within } from '../../text-game/src/ambient/select.ts'
import { place } from '../../text-game/src/story.ts'
import { prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import type { Activity } from './cast.ts'
import type { SpaceId } from './levels.ts'
import { spaces } from './levels.ts'
import type { Vec } from './world.ts'
import { add, length, normalize, scale, sub, vec } from './world.ts'
import { mulberry } from './synth.ts'

// downtown.ts exports this, and it lands in the town-map PR. This layer stacks on the story work, which does not
// carry that file, so the conversion lives here.
const yawOf = (f: Vec): number => Math.atan2(f.x, f.z)

// Ambient life, first layer (issue #44): where the prologue's town stands and walks. Who is around, and when, is the
// story's data (text-game/src/ambient/prologueTown.ts, keyed by place and story clock); what they say comes from the
// story's select.ts. This file only places them: authored activity slots, claimed one person at a time, and a pose
// for each person as a pure function of the story state, a seed and the seconds since the space opened, so a replay
// with the same seed puts everyone in the same place.

// What a slot is for. A person wants one kind (see `wants`), the way their habit reads.
export type SlotKind =
  | 'tap'
  | 'stool'
  | 'table'
  | 'lean'
  | 'jukebox'
  | 'pool'
  | 'booth'
  | 'end'
  | 'bench'
  | 'porch'
  | 'corner'
  | 'curb'
  | 'door'
  | 'stroll'
  | 'fishing'
  | 'dock'

// Downtown is a space id once the town-map layer has landed. This layer's PR is on the story stack, whose SpaceId
// does not name it yet, so the slots carry the id themselves.
export type AmbientSpace = SpaceId | 'downtown'

// An authored point in a space. `spot` is the story's place for the bar, or the window's town-map spot downtown.
// `face` is a unit vector, as the spawns write it. A stroll slot is a beat walked back and forth from `at` to `to`, by
// up to `seats` people abreast: a couple, a family.
export type Slot = Readonly<{
  id: string
  space: AmbientSpace
  spot: string
  kind: SlotKind
  at: Vec
  face: Vec
  activity: Activity
  to?: Vec
  seats?: number
}>

const N = vec(0, -1)
const S = vec(0, 1)
const E = vec(1, 0)
const W = vec(-1, 0)

const at = (space: AmbientSpace, spot: string) => (id: string, kind: SlotKind, x: number, z: number, face: Vec, activity: Activity = 'stand'): Slot => ({
  id: `${spot}.${id}`,
  space,
  spot,
  kind,
  at: vec(x, z),
  face,
  activity,
})

const stroll = (spot: string, id: string, from: Vec, to: Vec, seats: number): Slot => ({
  ...at('downtown', spot)(id, 'stroll', from.x, from.z, normalize(sub(to, from)), 'stand'),
  to,
  seats,
})

// The Silver Pan, in the bar space's own meters (levels.ts), around its dressing (silverPan.ts): the counter runs
// x -5..2 at z -3.3 with stools along it, the card game is at the free table (-4.2, 1.8), the pool table is west of
// it, the booth is in the southeast corner and the jukebox stands against the east wall. Curly and Wade's table and
// Hank's place are the space's figures. The old-timer sleeps on the last stool.
const bar = at('bar', 'silverPan')
const town = (spot: string) => at('downtown', spot)

export const slots: readonly Slot[] = [
  bar('tap', 'tap', -3.8, -4.08, S),
  bar('stool1', 'stool', -4.5, -2.35, N, 'sitDrink'),
  bar('stool2', 'stool', -3.5, -2.35, N, 'sitDrink'),
  bar('end', 'end', 1.5, -2.35, N, 'sit'),
  bar('jukebox', 'jukebox', 4.85, -0.5, E),
  bar('pool.a', 'pool', -2.35, -0.9, W),
  bar('pool.b', 'pool', -5.4, -0.6, E),
  bar('booth.n', 'booth', 4.9, 2.85, S, 'sitDrink'),
  bar('booth.s', 'booth', 4.9, 4.35, N, 'sitDrink'),
  bar('table.n', 'table', -4.2, 0.75, S, 'sitDrink'),
  bar('table.s', 'table', -4.2, 2.85, N, 'sitDrink'),
  bar('table.w', 'table', -5.25, 1.8, E, 'sitDrink'),
  bar('table.e', 'table', -3.15, 1.8, W, 'sitDrink'),

  // The night walk home: Second Avenue east of the Silver Pan's door, then the boarding house porch on Third.
  town('secondAvenue')('preacher', 'corner', 44, 49.2, S),
  town('secondAvenue')('cab', 'curb', 62, 51.6, N),
  stroll('secondAvenue', 'walk', vec(46, 49.3), vec(72, 49.3), 2),
  town('boardingHouse porch')('step', 'porch', 128.5, 97, S, 'sit'),
  town('boardingHouse porch')('rail', 'porch', 139.5, 97.2, S),

  // The morning walk to the river: down Cushman, along First, out the gangway; the café is seen down Second.
  town('cushman')('wall', 'lean', -6.5, 40, E),
  town('cushman')('corner', 'corner', -6.6, 52, E),
  stroll('cushman', 'walk', vec(5.5, 20), vec(5.5, 44), 2),
  town('nlCafe')('door', 'door', 12, 63.2, N),
  town('nlCafe')('step', 'door', 15.5, 63.3, N),
  town('nlCafe')('bench', 'bench', 9, 62.6, N, 'sit'),
  town('nlCafe')('post', 'lean', 18.5, 62.8, N),
  stroll('firstAvenue', 'walk', vec(20, 14.5), vec(70, 14.5), 3),
  town('floatDock')('cleat', 'dock', 122.5, -13, W),
  town('floatDock')('edge', 'fishing', 113, -21.3, N),
]

// The slot kinds each person heads for, best first, read off their habit in prologueTown.ts. Someone with windows in
// two places lists a kind for each: the reporter drinks at the bar at night and leans on a wall in the morning.
export const wants: Readonly<Record<string, readonly SlotKind[]>> = {
  hank: ['tap'],
  nightBartender: ['tap'],
  airmanJukebox: ['jukebox'],
  airmanCounter: ['pool', 'stool'],
  airmanPool: ['pool'],
  pilotGray: ['booth'],
  pilotYoung: ['booth'],
  miner: ['end', 'stool'],
  reporter: ['table', 'lean'],
  foreman: ['table', 'lean'],
  preacher: ['corner'],
  cabbie: ['curb'],
  touristHusband: ['stroll'],
  touristWife: ['stroll'],
  landlady: ['porch'],
  boarder: ['porch'],
  waitress: ['door'],
  cook: ['door'],
  landClerk: ['bench'],
  paperKid: ['corner'],
  mother: ['stroll'],
  father: ['stroll'],
  daughter: ['stroll'],
  dockHand: ['dock'],
  fisherman: ['fishing'],
}

// How each townsperson looks as a gray-box figure until they have models: coat, skin, hair and height. The bar's
// patrons (silverPan.ts) and the people downtown (townsfolk.ts) wear these.
export type Look = Readonly<{ coat: string; skin: string; hair: string; height: number }>

const looks: Readonly<Record<string, Look>> = {
  nightBartender: { coat: '#d8d0bc', skin: '#d9a982', hair: '#2e2018', height: 1.76 },
  airmanJukebox: { coat: '#5c6650', skin: '#c99a74', hair: '#3a2a1c', height: 1.78 },
  airmanCounter: { coat: '#5c6650', skin: '#e3b28a', hair: '#8a6a3a', height: 1.74 },
  airmanPool: { coat: '#6a7058', skin: '#8a5a3a', hair: '#1e1612', height: 1.81 },
  pilotGray: { coat: '#6e5a40', skin: '#d4a07a', hair: '#b8b4ac', height: 1.72 },
  pilotYoung: { coat: '#4e5a6a', skin: '#e0b090', hair: '#7a5a34', height: 1.8 },
  miner: { coat: '#5a4a38', skin: '#c88e66', hair: '#d0ccc4', height: 1.68 },
  reporter: { coat: '#7a7464', skin: '#e2b896', hair: '#4a3424', height: 1.75 },
  foreman: { coat: '#7a3a2a', skin: '#c99068', hair: '#5a4a3a', height: 1.84 },
  preacher: { coat: '#24242a', skin: '#d8ac88', hair: '#9a948a', height: 1.79 },
  cabbie: { coat: '#4a4030', skin: '#c4926a', hair: '#2a2018', height: 1.73 },
  touristHusband: { coat: '#8a7a5a', skin: '#e6bc98', hair: '#6a5a44', height: 1.8 },
  touristWife: { coat: '#a85a5a', skin: '#e8c0a0', hair: '#c8a060', height: 1.65 },
  landlady: { coat: '#6a4a5a', skin: '#dcb092', hair: '#a8a29a', height: 1.6 },
  boarder: { coat: '#5a5448', skin: '#d0a07c', hair: '#3a2c20', height: 1.77 },
  waitress: { coat: '#c8c0a8', skin: '#e2b490', hair: '#6a3a22', height: 1.63 },
  cook: { coat: '#e4e0d4', skin: '#b88660', hair: '#1e1814', height: 1.76 },
  landClerk: { coat: '#4a5058', skin: '#e0b896', hair: '#5a4632', height: 1.74 },
  paperKid: { coat: '#7a5a3a', skin: '#e4b894', hair: '#a8702e', height: 1.42 },
  mother: { coat: '#4a6a7a', skin: '#deb08e', hair: '#4a3020', height: 1.64 },
  father: { coat: '#5a4a3a', skin: '#d2a07c', hair: '#3a2a1e', height: 1.82 },
  daughter: { coat: '#c86a4a', skin: '#e6bc9a', hair: '#8a5a2a', height: 1.22 },
  dockHand: { coat: '#5a6048', skin: '#b07a52', hair: '#2a1e16', height: 1.78 },
  fisherman: { coat: '#6a6a4a', skin: '#c89470', hair: '#8a8478', height: 1.7 },
}

const plain: Look = { coat: '#6a5a48', skin: '#d4a07a', hair: '#4a3424', height: 1.75 }

export const lookOf = (who: string): Look => looks[who] ?? plain

// Who holds each slot, by slot id. A person holds at most one.
export type Claims = Readonly<Record<string, readonly string[]>>

export const capacity = (s: Slot): number => s.seats ?? 1

export const release = (c: Claims, who: string): Claims =>
  Object.fromEntries(Object.entries(c).flatMap(([id, held]) => {
    const rest = held.filter((h) => h !== who)
    return rest.length ? [[id, rest] as const] : []
  }))

// Taking a slot lets go of the one held before. A full slot refuses: undefined.
export const claim = (c: Claims, slot: Slot, who: string): Claims | undefined => {
  const freed = release(c, who)
  const held = freed[slot.id] ?? []
  return held.length < capacity(slot) ? { ...freed, [slot.id]: [...held, who] } : undefined
}

const room = (c: Claims, s: Slot): boolean => (c[s.id] ?? []).length < capacity(s)

// The schedule lookup: the window the story clock and place put someone in now, and the spot and space it means.
export const windowNow = (s: State, a: Ambient): Window | undefined => a.at.find(within(s))

export const spotOf = (w: Window): string => w.spot ?? w.place

export const spaceOf = (spot: string): AmbientSpace | undefined => slots.find((s) => s.spot === spot)?.space

// People a space already stands as its own figures (Hank behind the bar, the landlady in her parlor) are not placed
// again while the story is at the place that space stages them for.
const staged = (s: State): ReadonlySet<string> =>
  new Set(Object.values(spaces).flatMap((sp) => sp.figures.filter((f) => (f.during ?? sp.place) === place(s)).map((f) => f.id)))

export const scheduled = (s: State): readonly Ambient[] => {
  const here = staged(s)
  return present(s, prologueTown).filter((a) => !here.has(a.id))
}

// Everyone here now, in cast order, takes a free slot at their spot of the first kind they want that has room, or any
// free slot there if none does. The seed picks among equal choices.
export const assign = (s: State, seed: number): Claims => {
  const rand = mulberry(seed)
  return scheduled(s).reduce<Claims>((c, a) => {
    const w = windowNow(s, a)
    const open = w ? slots.filter((sl) => sl.spot === spotOf(w) && room(c, sl)) : []
    const kind = (wants[a.id] ?? []).find((k) => open.some((sl) => sl.kind === k))
    const pool = kind ? open.filter((sl) => sl.kind === kind) : open
    const pick = pool[Math.floor(rand() * pool.length)]
    return pick ? (claim(c, pick, a.id) ?? c) : c
  }, {})
}

export type Pose = Readonly<{ who: string; slot: string; space: AmbientSpace; at: Vec; yaw: number; activity: Activity; speed: number }>

export const STROLL_SPEED = 1.1
// Shoulder to shoulder on a beat: two bodies' radii and a little air.
export const ABREAST = 0.8

// Where along a beat a strolling group is at t: back and forth, from a start the seed picks.
const walkBeat = (sl: Slot, seed: number, t: number): Readonly<{ along: number; dir: 1 | -1 }> => {
  const len = length(sub(sl.to ?? sl.at, sl.at))
  const start = mulberry(seed ^ [...sl.id].reduce((h, ch) => Math.imul(h, 31) + ch.charCodeAt(0), 7))() * 2 * len
  const d = (start + t * STROLL_SPEED) % (2 * len)
  return d < len ? { along: d, dir: 1 } : { along: 2 * len - d, dir: -1 }
}

const posesOf = (sl: Slot, held: readonly string[], seed: number, t: number): readonly Pose[] => {
  if (!sl.to) return held.map((who) => ({ who, slot: sl.id, space: sl.space, at: sl.at, yaw: yawOf(sl.face), activity: sl.activity, speed: 0 }))
  const { along, dir } = walkBeat(sl, seed, t)
  const side = vec(-sl.face.z, sl.face.x)
  const n = capacity(sl)
  return held.map((who, i) => ({
    who,
    slot: sl.id,
    space: sl.space,
    at: add(add(sl.at, scale(sl.face, along)), scale(side, (i - (n - 1) / 2) * ABREAST)),
    yaw: yawOf(scale(sl.face, dir)),
    activity: sl.activity,
    speed: STROLL_SPEED,
  }))
}

// Everyone placed now, t seconds after the space opened. Same state, seed and t: same poses.
export const poses = (s: State, seed: number, t: number): readonly Pose[] => {
  const c = assign(s, seed)
  return slots.flatMap((sl) => posesOf(sl, c[sl.id] ?? [], seed, t))
}

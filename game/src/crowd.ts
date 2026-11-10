import type { State } from '../../text-game/src/types.ts'
import type { Reaction } from '../../text-game/src/ambient/format.ts'
import { say } from '../../text-game/src/ambient/select.ts'
import { prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import type { AmbientSpace, Pose } from './ambient.ts'
import { poses } from './ambient.ts'
import { JOG_SPEED, WALK_SPEED } from './cast.ts'
import { lookOf as barLook } from './silverPan.ts'
import type { Visit } from './talk.ts'
import { attending, queue } from './talk.ts'
import type { Vec } from './world.ts'
import { RADIUS, angleBetween, angleTo, distance, length, offAxis, scale, sub, vec } from './world.ts'

// Ambient life, second layer (issue #44): the town ambient.ts places, as a crowd the renderer draws. Who stands where
// is ambient.ts's; this file adds how each of them looks, how much of them to draw at a distance (LOD), and what they
// do about Owen: look at him, nod as he passes, turn on him when he runs or bumps them or stares, and step aside when
// he stands in a walker's way. Pure functions; render.ts keeps only the per-person timers.

// The seed the town is placed with in play, the same one talk.ts's visits use, so what is drawn is what is talked to.
export const SEED = 1

export type Look = ReturnType<typeof barLook>

// The street's people, as gray-box figures until they have models: the bar's patrons dress in silverPan.ts.
const townLooks: Readonly<Record<string, Look>> = {
  preacher: { coat: '#2a2a2e', skin: '#d8ab86', hair: '#c8c4bc', height: 1.78 },
  cabbie: { coat: '#9a7a30', skin: '#c58f66', hair: '#3a2a1e', height: 1.73 },
  touristHusband: { coat: '#b9a888', skin: '#f0c4a0', hair: '#7a6a5a', height: 1.79 },
  touristWife: { coat: '#c4707a', skin: '#efc6a4', hair: '#c9a060', height: 1.64 },
  landlady: { coat: '#6a4a6a', skin: '#e2b896', hair: '#a8a29a', height: 1.6 },
  boarder: { coat: '#4a5a48', skin: '#d0a07c', hair: '#2a1e16', height: 1.77 },
  waitress: { coat: '#e6dccb', skin: '#e8b892', hair: '#8a3a22', height: 1.63 },
  cook: { coat: '#f0ece4', skin: '#b07a52', hair: '#1a1410', height: 1.8 },
  landClerk: { coat: '#3e4652', skin: '#e4bc98', hair: '#5a4632', height: 1.74 },
  paperKid: { coat: '#a8423a', skin: '#e8bc96', hair: '#c08a4a', height: 1.42 },
  mother: { coat: '#5a7a8a', skin: '#8a5e40', hair: '#1e1612', height: 1.62 },
  father: { coat: '#6a5a3a', skin: '#86583a', hair: '#1a1410', height: 1.76 },
  daughter: { coat: '#d8b040', skin: '#8e6244', hair: '#1e1612', height: 1.3 },
  dockHand: { coat: '#3a4a5e', skin: '#c4906a', hair: '#6a4a2a', height: 1.83 },
  fisherman: { coat: '#5e6a3a', skin: '#d2a47e', hair: '#9a8a7a', height: 1.71 },
}

export const lookOf = (who: string): Look => townLooks[who] ?? barLook(who)

// Everyone the schedule has in this space now, t seconds after it opened.
export const crowdIn = (s: State, space: AmbientSpace, t: number, seed: number = SEED): readonly Pose[] =>
  poses(s, seed, t).filter((p) => p.space === space)

// Crowd LOD by distance from the camera's subject: drawn whole and posed every frame up close, posed four times a second
// further out, a single box (an impostor) posed once a second beyond that, and not drawn past the far edge.
export type Tier = 'full' | 'slow' | 'impostor' | 'hidden'

export const LOD_FULL = 15
export const LOD_SLOW = 40
export const LOD_IMPOSTOR = 90

export const tierAt = (d: number): Tier => (d < LOD_FULL ? 'full' : d < LOD_SLOW ? 'slow' : d < LOD_IMPOSTOR ? 'impostor' : 'hidden')

// Seconds between pose updates, by tier.
export const UPDATE_EVERY: Readonly<Record<Tier, number>> = { full: 0, slow: 0.25, impostor: 1, hidden: Infinity }

export const due = (tier: Tier, last: number, now: number): boolean => now - last >= UPDATE_EVERY[tier]

// What Owen is doing, as the people around him can see it.
export type Owen = Readonly<{ pos: Vec; vel: Vec; view: number; interior: boolean }>

// A person's notice of Owen, most pressing first. `bump`, `run` and `stare` are the story's reactions, with lines in
// prologueTown.ts; `way` is a walker he stands in front of; `nod` as he walks past; `look` when he is merely near.
export type Notice = Reaction | 'way' | 'nod' | 'look' | 'none'

export const LOOK_RANGE = 4
// How wide a person's notice is either side of where they face.
export const FIELD = (110 * Math.PI) / 180
export const NOD_RANGE = 2.2
export const RUN_RANGE = 6
// Indoors a brisk walk is already running; outdoors it takes more than the walk to the jog.
export const RUN_INDOORS = WALK_SPEED + 0.2
export const RUN_OUTDOORS = (WALK_SPEED + JOG_SPEED) / 2
export const STARE_RANGE = 6
export const STARE_HALF = (8 * Math.PI) / 180
export const STARE_TIME = 2.5
// How far ahead of a walker Owen is in the way, and how wide the path is.
export const WAY_AHEAD = 2
export const WAY_WIDE = 0.8
export const SIDESTEP = 0.7
// How far a seated or standing person's head turns from their body before the body has to follow.
export const HEAD_TURN = (70 * Math.PI) / 180

export const staringAt = (p: Pose, o: Owen): boolean => distance(o.pos, p.at) < STARE_RANGE && offAxis(o.pos, o.view, p.at) < STARE_HALF

// Seconds Owen has stared at someone: grows while he does, and drops to nothing the moment he looks away.
export const stareTime = (prev: number, dt: number, staring: boolean): number => (staring ? prev + dt : 0)

const running = (o: Owen): boolean => length(o.vel) > (o.interior ? RUN_INDOORS : RUN_OUTDOORS)

const inWay = (p: Pose, o: Owen): boolean => {
  if (p.speed <= 0) return false
  const ahead = vec(Math.sin(p.yaw), Math.cos(p.yaw))
  const rel = sub(o.pos, p.at)
  const along = rel.x * ahead.x + rel.z * ahead.z
  const side = rel.x * ahead.z - rel.z * ahead.x
  return along > 0 && along < WAY_AHEAD && Math.abs(side) < WAY_WIDE
}

export const noticeOf = (p: Pose, o: Owen, staredFor: number): Notice => {
  const d = distance(p.at, o.pos)
  const sees = angleBetween(p.yaw, angleTo(p.at, o.pos)) < FIELD
  if (d < 2 * RADIUS) return 'bump'
  if (d < RUN_RANGE && running(o)) return 'run'
  if (inWay(p, o)) return 'way'
  if (staredFor >= STARE_TIME && d < STARE_RANGE) return 'stare'
  if (!sees) return 'none'
  if (d < NOD_RANGE && length(o.vel) > 0.3) return 'nod'
  return d < LOOK_RANGE ? 'look' : 'none'
}

// How a person stands once they have noticed Owen: their body's yaw, their head's turn from it, and how far they have
// stepped aside from their beat.
export type Reacting = Readonly<{ notice: Notice; yaw: number; head: number; aside: Vec }>

const clampHead = (a: number): number => Math.max(-HEAD_TURN, Math.min(HEAD_TURN, a))

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a))

export const react = (p: Pose, o: Owen, staredFor: number): Reacting => {
  const notice = noticeOf(p, o, staredFor)
  const toward = angleTo(p.at, o.pos)
  const still: Reacting = { notice, yaw: p.yaw, head: 0, aside: vec(0, 0) }
  if (notice === 'none') return still
  if (notice === 'look' || notice === 'nod') return { ...still, head: clampHead(wrap(toward - p.yaw)) }
  if (notice === 'way') {
    // Step to whichever side of the beat Owen is not on, and keep walking.
    const right = vec(Math.cos(p.yaw), -Math.sin(p.yaw))
    const rel = sub(o.pos, p.at)
    const away = rel.x * right.x + rel.z * right.z > 0 ? -1 : 1
    return { ...still, head: clampHead(wrap(toward - p.yaw)), aside: scale(right, away * SIDESTEP) }
  }
  // Bumped, run past, stared at: they turn on him.
  return { ...still, yaw: toward }
}

// A nod: the head dips once and comes back up over NOD_TIME seconds from when it started.
export const NOD_TIME = 0.6
export const NOD_PITCH = (18 * Math.PI) / 180

export const nodPitch = (since: number): number => (since < 0 || since >= NOD_TIME ? 0 : NOD_PITCH * Math.sin((Math.PI * since) / NOD_TIME))

const reactions: readonly Notice[] = ['bump', 'run', 'stare']

const isReaction = (n: Notice): n is Reaction => reactions.includes(n)

// What someone says when Owen bumps them, runs past or stares: the story's own line for it, queued as a subtitle,
// once per exchange (not again while they are still on him). Someone with no line for it says nothing.
export const speakUp = (v: Visit, who: string, n: Notice): Visit => {
  const a = prologueTown.find((x) => x.id === who)
  if (!a || !isReaction(n) || attending(v.talk, who, v.clock)) return v
  const said = say(v.game.story, a, `react:${n}`, v.talk.spent)
  return said ? { ...v, talk: queue({ ...v.talk, spent: said.spent }, a, said.bit.lines, v.clock) } : v
}

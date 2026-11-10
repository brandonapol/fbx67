import type { ClipId } from './cast.ts'
import { WALK_SPEED } from './cast.ts'
import type { Surface } from './campGround.ts'
import type { Vec } from './world.ts'
import { angleTo, distance, length, vec } from './world.ts'

// Curly at the survey camp (#49): not a turning cone but a man at work. He refuels from the jerry cans, walks down to
// check the floats, walks back to look the tail over, swats mosquitoes, and then stops, lights a cigarette and looks
// over the camp before he goes back to the cans. The look is the danger: before it his head turns, and a sound cue
// (his lighter) says the task is done. Running on the gravel is loud enough for him to hear across the bar; he turns
// to the noise and looks there a while. Walking through the willows makes no sound at all.
//
// Where he is and where he looks is a pure function of his routine clock: the seconds he has worked, which stop while
// he is looking toward a noise (Watch.lost), so his day picks up where it left off.

export const CURLY_AT = vec(-6.4, 5.4)
export const CURLY_RANGE = 19
export const CURLY_HALF_ANGLE = 0.55

// Facing the plane (west), and the arc he looks over the camp (east).
const AT_PLANE = -Math.PI / 2
const SWEEP_FROM = Math.PI / 2 - 0.85
const SWEEP_TO = Math.PI / 2 + 0.85
// How far his head turns ahead of his body before he looks: over his shoulder, not round to his back.
const HEAD_LEAD = 1.2

export type BeatId = 'refuel' | 'toFloat' | 'floats' | 'toTail' | 'tail' | 'toCans' | 'swat' | 'glance' | 'look' | 'back'

type Beat = Readonly<{ id: BeatId; time: number; path?: readonly Vec[]; facing?: number; clip?: ClipId }>

const FLOAT = vec(-7.0, 7.6)
const TAIL = vec(-8.2, 2.6)

const pathLength = (p: readonly Vec[]): number => p.slice(1).reduce((s, q, i) => s + distance(p[i], q), 0)

const walkBeat = (id: BeatId, path: readonly Vec[]): Beat => ({ id, time: pathLength(path) / WALK_SPEED, path })

export const BEATS: readonly Beat[] = [
  { id: 'refuel', time: 3.0, facing: AT_PLANE },
  walkBeat('toFloat', [CURLY_AT, FLOAT]),
  { id: 'floats', time: 1.8, facing: AT_PLANE },
  walkBeat('toTail', [FLOAT, vec(-7.2, 4.4), TAIL]),
  { id: 'tail', time: 1.0, facing: -Math.PI * 0.75 },
  walkBeat('toCans', [TAIL, CURLY_AT]),
  { id: 'swat', time: 1.0, facing: AT_PLANE, clip: 'wave' },
  { id: 'glance', time: 0.9, facing: AT_PLANE },
  { id: 'look', time: 3.4, clip: 'drink' },
  { id: 'back', time: 0.8 },
]

export const CURLY_PERIOD = BEATS.reduce((s, b) => s + b.time, 0)

// When in the period each beat starts.
export const beatStart = (id: BeatId): number => {
  const i = BEATS.findIndex((b) => b.id === id)
  return BEATS.slice(0, i).reduce((s, b) => s + b.time, 0)
}

// The look over the camp, from the moment his body starts to turn to the end of the sweep.
export const LOOK_FROM = beatStart('look')
export const LOOK_TO = LOOK_FROM + BEATS.find((b) => b.id === 'look')!.time
const LOOK_TURN = 0.5

export type Pose = Readonly<{
  beat: BeatId
  at: Vec
  // The way his body faces, and how far his head is turned from it; where he looks is the sum.
  heading: number
  head: number
  clip: ClipId
  speed: number
  // Whether he is looking: only while he looks over the camp, or toward a noise.
  eyes: boolean
}>

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k

const smooth = (k: number): number => k * k * (3 - 2 * k)

const along = (path: readonly Vec[], d: number): Readonly<{ at: Vec; heading: number }> => {
  const legs = path.slice(1).map((q, i) => [path[i], q] as const)
  const go = (i: number, left: number): Readonly<{ at: Vec; heading: number }> => {
    const [a, b] = legs[i]
    const l = distance(a, b)
    if (left <= l || i === legs.length - 1) {
      const k = l > 0 ? Math.min(1, left / l) : 1
      return { at: vec(lerp(a.x, b.x, k), lerp(a.z, b.z, k)), heading: angleTo(a, b) }
    }
    return go(i + 1, left - l)
  }
  return go(0, d)
}

const wrap = (t: number): number => ((t % CURLY_PERIOD) + CURLY_PERIOD) % CURLY_PERIOD

const beatAt = (t: number): Readonly<{ beat: Beat; into: number }> => {
  const u = wrap(t)
  const go = (i: number, from: number): Readonly<{ beat: Beat; into: number }> =>
    i === BEATS.length - 1 || u < from + BEATS[i].time ? { beat: BEATS[i], into: u - from } : go(i + 1, from + BEATS[i].time)
  return go(0, 0)
}

export const beatOf = (t: number): BeatId => beatAt(t).beat.id

// Where Curly is at `t` seconds into his routine, and where he is looking.
export const routine = (t: number): Pose => {
  const { beat, into } = beatAt(t)
  const k = Math.min(1, into / beat.time)
  const still = (heading: number, head = 0, eyes = false, clip: ClipId = beat.clip ?? 'idle'): Pose => ({
    beat: beat.id,
    at: CURLY_AT,
    heading,
    head,
    clip,
    speed: 0,
    eyes,
  })
  if (beat.path) {
    const p = along(beat.path, into * WALK_SPEED)
    return { beat: beat.id, at: p.at, heading: p.heading, head: 0, clip: 'walk', speed: WALK_SPEED, eyes: false }
  }
  if (beat.id === 'floats') return { ...still(AT_PLANE), at: FLOAT }
  if (beat.id === 'tail') return { ...still(beat.facing ?? AT_PLANE), at: TAIL }
  if (beat.id === 'glance') return still(AT_PLANE, HEAD_LEAD * smooth(k))
  if (beat.id === 'look') {
    // The body comes round to where his head already looks, then sweeps the camp.
    if (into < LOOK_TURN) {
      const j = smooth(into / LOOK_TURN)
      return still(lerp(AT_PLANE, SWEEP_FROM, j), HEAD_LEAD * (1 - j), true)
    }
    return still(lerp(SWEEP_FROM, SWEEP_TO, (into - LOOK_TURN) / (beat.time - LOOK_TURN)), 0, true)
  }
  if (beat.id === 'back') return still(lerp(SWEEP_TO, AT_PLANE + 2 * Math.PI, smooth(k)))
  return still(beat.facing ?? AT_PLANE)
}

// --- Noise ---

// How far away a step can be heard: running on the gravel carries across the bar, walking on it only close by; the
// willows rustle only at a run; the moss is soft.
const RUN_FROM = (WALK_SPEED + 3.5) / 2
const MOVING = 0.15

export const HEARING: Readonly<Record<Surface, Readonly<{ walk: number; run: number }>>> = {
  gravel: { walk: 2.5, run: 18 },
  willow: { walk: 0, run: 7 },
  tussock: { walk: 0, run: 6 },
  water: { walk: 3, run: 12 },
}

export const noiseRadius = (surface: Surface, speed: number): number =>
  speed <= MOVING ? 0 : speed > RUN_FROM ? HEARING[surface].run : HEARING[surface].walk

// --- What Curly is doing in the game: his clock, the noise he turned to, how much he has seen ---

// He hears a noise: his head turns to it (ALARM_GLANCE), then he looks there (ALARM_LOOK), then back to work.
export const ALARM_GLANCE = 0.6
export const ALARM_LOOK = 2.4
export const ALARM_TIME = ALARM_GLANCE + ALARM_LOOK

// The indicator fills in FILL seconds of being seen and empties in DRAIN unseen. Full while Owen is hiding his notes
// and Curly has caught him.
export const FILL = 0.5
export const DRAIN = 1.2

// The busted beat: Curly's line plays this long before the retry comes up.
export const CAUGHT_TIME = 1.8
export const CAUGHT_LINE = "Owen? What're you doing over there?"

export type Alarm = Readonly<{ at: Vec; since: number }>

export type Watch = Readonly<{
  // Seconds of the game clock Curly spent looking toward a noise instead of working.
  lost: number
  alarm?: Alarm
  // How much of Owen Curly has seen, 0 to 1 (the indicator).
  aware: number
  // Seconds since Curly caught Owen hiding, while the busted beat plays.
  caught?: number
}>

export const calm: Watch = { lost: 0, aware: 0 }

// The routine's own clock at game time t.
export const clockOf = (w: Watch, t: number): number => t - w.lost - (w.alarm ? t - w.alarm.since : 0)

const turnTo = (from: number, to: number): number => from + Math.atan2(Math.sin(to - from), Math.cos(to - from))

// Where he is and looks at game time t: his routine, or turned toward a noise, or toward Owen once he has caught him.
export const curlyPose = (w: Watch, t: number, owen?: Vec): Pose => {
  const base = routine(clockOf(w, t))
  const toward = (p: Vec): number => turnTo(base.heading + base.head, angleTo(base.at, p))
  if (w.caught !== undefined && owen) return { ...base, heading: toward(owen), head: 0, clip: 'talk', speed: 0, eyes: true }
  if (!w.alarm) return base
  const into = t - w.alarm.since
  const aim = toward(w.alarm.at)
  if (into < ALARM_GLANCE) {
    const turn = Math.max(-HEAD_LEAD, Math.min(HEAD_LEAD, aim - base.heading - base.head))
    return { ...base, head: base.head + turn * smooth(into / ALARM_GLANCE), clip: 'idle', speed: 0, eyes: false }
  }
  const scan = 0.25 * Math.sin(((into - ALARM_GLANCE) / ALARM_LOOK) * Math.PI * 2)
  return { ...base, heading: aim + scan, head: 0, clip: 'idle', speed: 0, eyes: true }
}

export const gaze = (p: Pose): number => p.heading + p.head

// One step of Curly's attention: whether he hears Owen, how his alarm runs out, how the indicator fills.
export type Heard = Readonly<{ pos: Vec; vel: Vec; surface: Surface }>

export const listen = (w: Watch, t: number, owen: Heard): Watch => {
  const ended = w.alarm && t - w.alarm.since >= ALARM_TIME ? { ...w, lost: w.lost + ALARM_TIME, alarm: undefined } : w
  if (ended.alarm || ended.caught !== undefined) return ended
  const pose = routine(clockOf(ended, t))
  if (pose.eyes || pose.beat === 'glance') return ended
  const r = noiseRadius(owen.surface, length(owen.vel))
  return r > 0 && distance(owen.pos, pose.at) <= r ? { ...ended, alarm: { at: owen.pos, since: t } } : ended
}

export const notice = (w: Watch, seen: boolean, dt: number): Watch => ({
  ...w,
  aware: Math.max(0, Math.min(1, w.aware + (seen ? dt / FILL : -dt / DRAIN))),
})

// His lighter: the cue that he has finished a task and is about to look. Heard as the glance begins.
export const cueBetween = (from: number, to: number): boolean => {
  const at = beatStart('glance')
  if (to < from) return false
  const k0 = Math.floor((from - at) / CURLY_PERIOD)
  const k1 = Math.floor((to - at) / CURLY_PERIOD)
  return k1 > k0
}

import type { Space } from './levels.ts'
import { figureBox } from './levels.ts'
import type { Box, Vec } from './world.ts'
import { vec } from './world.ts'
import { keepBehind } from './skiff.ts'

export type V3 = readonly [number, number, number]

export type Block = Readonly<{ box: Box; y0: number; y1: number }>

export type Rig = Readonly<{ yaw: number; pitch: number; base: number; reach: number; idle: number }>

export type Pose = Readonly<{ eye: V3; target: V3; close: boolean }>

export type Look = Readonly<{ yaw: number; pitch: number }>

const deg = (d: number): number => (d * Math.PI) / 180

export const FOV = 36
export const NEAR = 0.05
export const PITCH_MIN = deg(-20)
export const PITCH_MAX = deg(15)
export const PITCH_REST = 0
export const ARM = { interior: 1.8, exterior: 2.6 } as const
export const EYE = 1.7
export const SHOULDER = 0.5
export const MARGIN = 0.25
export const CEILING = 2.7
export const FLOOR = 0.3
export const BLEND_TIME = 0.4
export const RELEASE_TIME = 0.35
export const SETTLE_DELAY = 0.5
export const SETTLE_TIME = 0.4
export const RECENTER_DELAY = 1.5
export const RECENTER_TIME = 0.8
export const BOB = 0.03
export const TOO_CLOSE = 0.9

export const blocks = (s: Space): readonly Block[] => [
  ...s.props.filter((p) => p.solid && p.h > 0.05).map((p) => ({ box: p.box, y0: p.y ?? 0, y1: (p.y ?? 0) + p.h })),
  ...s.figures.map((f) => ({ box: figureBox(f), y0: 0, y1: f.height })),
]

export const armFor = (s: Space): number => (s.interior ? ARM.interior : ARM.exterior)

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))

const ease = (dt: number, time: number): number => Math.min(1, dt / time)

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a))

export const rigFor = (facing: number, base: number): Rig => ({ yaw: facing, pitch: PITCH_REST, base, reach: 1, idle: 0 })

// The rig and the space (and bust) it was placed for. It is placed behind the player once, on the first frame in a
// space or after a bust; after that it follows (follow, below).
export type Placed = Readonly<{ rig: Rig; key: string }>

export const place = (p: Placed, g: Readonly<{ space: string; busts: number; facing: number }>): Placed => {
  const key = `${g.space}|${g.busts}`
  return p.key === key ? p : { rig: rigFor(g.facing, p.rig.base), key }
}

export const orbit = (rig: Rig, d: Look): Rig => ({
  ...rig,
  yaw: rig.yaw + d.yaw,
  pitch: clamp(rig.pitch + d.pitch, PITCH_MIN, PITCH_MAX),
})

export const settle = (rig: Rig, facing: number, d: Look, dt: number): Rig => {
  const idle = d.yaw !== 0 || d.pitch !== 0 ? 0 : rig.idle + dt
  const turned = orbit(rig, d)
  const pitch = idle > SETTLE_DELAY ? turned.pitch + (PITCH_REST - turned.pitch) * ease(dt, SETTLE_TIME) : turned.pitch
  const yaw = idle > RECENTER_DELAY ? turned.yaw + wrap(facing - turned.yaw) * ease(dt, RECENTER_TIME) : turned.yaw
  return { ...turned, idle, pitch, yaw }
}

export const forward = (yaw: number): Vec => vec(Math.sin(yaw), Math.cos(yaw))

export const right = (yaw: number): Vec => vec(-Math.cos(yaw), Math.sin(yaw))

export const toWorld = (stick: Readonly<{ x: number; y: number }>, yaw: number): Vec => {
  const f = forward(yaw)
  const r = right(yaw)
  return vec(r.x * stick.x + f.x * stick.y, r.z * stick.x + f.z * stick.y)
}

export const gaze = (rig: Rig): V3 => [
  Math.sin(rig.yaw) * Math.cos(rig.pitch),
  Math.sin(rig.pitch),
  Math.cos(rig.yaw) * Math.cos(rig.pitch),
]

export const pivot = (pos: Vec, bob = 0, eye = EYE): V3 => [pos.x, eye + bob, pos.z]

export const wanted = (rig: Rig, from: V3): V3 => {
  const d = gaze(rig)
  const r = right(rig.yaw)
  return [from[0] + r.x * SHOULDER - d[0] * rig.base, from[1] - d[1] * rig.base, from[2] + r.z * SHOULDER - d[2] * rig.base]
}

const slab = (p: number, dp: number, lo: number, hi: number): readonly [number, number] | undefined => {
  if (Math.abs(dp) < 1e-12) return p > lo && p < hi ? [-Infinity, Infinity] : undefined
  const [a, b] = [(lo - p) / dp, (hi - p) / dp]
  return [Math.min(a, b), Math.max(a, b)]
}

export const entry = (from: V3, to: V3, b: Block, margin = MARGIN): number => {
  const lo: V3 = [b.box.x - b.box.w / 2 - margin, b.y0 - margin, b.box.z - b.box.d / 2 - margin]
  const hi: V3 = [b.box.x + b.box.w / 2 + margin, b.y1 + margin, b.box.z + b.box.d / 2 + margin]
  const spans = [0, 1, 2].map((i) => slab(from[i], to[i] - from[i], lo[i], hi[i]))
  if (spans.some((s) => !s)) return 1
  const enter = Math.max(...spans.map((s) => s![0]))
  const exit = Math.min(...spans.map((s) => s![1]))
  if (enter > exit || enter > 1 || exit < 0) return 1
  return Math.max(0, enter - 1e-3)
}

const plane = (from: number, to: number, at: number, above: boolean): number => {
  const past = above ? to > at : to < at
  return past && to !== from ? clamp((at - from) / (to - from), 0, 1) : 1
}

export const reach = (from: V3, to: V3, s: Space, bs: readonly Block[] = blocks(s)): number =>
  Math.min(
    1,
    plane(from[1], to[1], FLOOR, false),
    s.interior ? plane(from[1], to[1], CEILING - MARGIN, true) : 1,
    ...bs.map((b) => entry(from, to, b)),
  )

export type Frame = Readonly<{ rig: Rig; pose: Pose }>

// eye is the player's eye height: the pivot the arm hangs from (bodies in cast.ts). behind, when set, is a heading the
// camera may not turn more than RIDE_LOOK from (the skiff ride, where the hooded man stands ahead).
export const follow = (rig: Rig, s: Space, pos: Vec, facing: number, look: Look, dt: number, bob = 0, height = EYE, behind?: number): Frame => {
  const settled = settle(rig, facing, look, dt)
  const turned = behind === undefined ? settled : { ...settled, yaw: keepBehind(settled.yaw, behind) }
  const step = ((ARM.exterior - ARM.interior) / BLEND_TIME) * dt
  const base = turned.base + clamp(armFor(s) - turned.base, -step, step)
  const from = pivot(pos, bob, height)
  const aim = wanted({ ...turned, base }, from)
  const free = reach(from, aim, s)
  const eased = turned.reach + (1 - turned.reach) * ease(dt, RELEASE_TIME)
  const next: Rig = { ...turned, base, reach: Math.min(free, eased) }
  const k = next.reach
  const eye: V3 = [from[0] + (aim[0] - from[0]) * k, from[1] + (aim[1] - from[1]) * k, from[2] + (aim[2] - from[2]) * k]
  const d = gaze(next)
  const close = Math.hypot(eye[0] - from[0], eye[1] - from[1], eye[2] - from[2]) < TOO_CLOSE
  return { rig: next, pose: { eye, target: [eye[0] + d[0], eye[1] + d[1], eye[2] + d[2]], close } }
}

export const bob = (t: number, speed: number, top: number, reduced: boolean): number =>
  reduced || top <= 0 ? 0 : BOB * Math.min(1, speed / top) * Math.sin(t * 2 * Math.PI * 1.8)

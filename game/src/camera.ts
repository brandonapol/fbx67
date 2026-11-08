import type { Space } from './levels.ts'
import type { Box, Vec } from './world.ts'
import { vec } from './world.ts'

export type V3 = readonly [number, number, number]

export type Block = Readonly<{ box: Box; y0: number; y1: number }>

export type Rig = Readonly<{ yaw: number; pitch: number; base: number; reach: number }>

export type Pose = Readonly<{ eye: V3; target: V3; close: boolean }>

export type Look = Readonly<{ yaw: number; pitch: number }>

export const PITCH_MIN = -0.35
export const PITCH_MAX = 0.9
export const PITCH_REST = 0.22
export const ARM = { interior: 2.2, exterior: 4.4 } as const
export const HEAD = 1.62
export const SHOULDER = 0.4
export const MARGIN = 0.25
export const CEILING = 2.7
export const FLOOR = 0.3
export const BLEND_TIME = 0.6
export const RELEASE_TIME = 0.35
export const BOB = 0.03
export const TOO_CLOSE = 0.6

export const FIGURE_WIDTH = 0.5

export const blocks = (s: Space): readonly Block[] => [
  ...s.props.filter((p) => p.solid && p.h > 0.05).map((p) => ({ box: p.box, y0: p.y ?? 0, y1: (p.y ?? 0) + p.h })),
  ...s.figures.map((f) => ({ box: { x: f.at.x, z: f.at.z, w: FIGURE_WIDTH, d: FIGURE_WIDTH }, y0: 0, y1: f.height })),
]

export const armFor = (s: Space): number => (s.interior ? ARM.interior : ARM.exterior)

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))

export const rigFor = (facing: number, base: number): Rig => ({ yaw: facing, pitch: PITCH_REST, base, reach: 1 })

export const orbit = (rig: Rig, d: Look): Rig => ({
  ...rig,
  yaw: rig.yaw + d.yaw,
  pitch: clamp(rig.pitch + d.pitch, PITCH_MIN, PITCH_MAX),
})

export const forward = (yaw: number): Vec => vec(Math.sin(yaw), Math.cos(yaw))

export const right = (yaw: number): Vec => vec(-Math.cos(yaw), Math.sin(yaw))

export const toWorld = (stick: Readonly<{ x: number; y: number }>, yaw: number): Vec => {
  const f = forward(yaw)
  const r = right(yaw)
  return vec(r.x * stick.x + f.x * stick.y, r.z * stick.x + f.z * stick.y)
}

export const gaze = (rig: Rig): V3 => [
  Math.sin(rig.yaw) * Math.cos(rig.pitch),
  -Math.sin(rig.pitch),
  Math.cos(rig.yaw) * Math.cos(rig.pitch),
]

export const head = (pos: Vec, bob = 0): V3 => [pos.x, HEAD + bob, pos.z]

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
  return enter < 0 || enter > exit || enter > 1 ? 1 : Math.max(0, enter - 1e-3)
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

export const follow = (rig: Rig, s: Space, pos: Vec, look: Look, dt: number, bob = 0): Frame => {
  const turned = orbit(rig, look)
  const base = turned.base + (armFor(s) - turned.base) * Math.min(1, dt / BLEND_TIME)
  const from = head(pos, bob)
  const aim = wanted({ ...turned, base }, from)
  const free = reach(from, aim, s)
  const eased = turned.reach + (1 - turned.reach) * Math.min(1, dt / RELEASE_TIME)
  const next: Rig = { ...turned, base, reach: Math.min(free, eased) }
  const k = next.reach
  const eye: V3 = [from[0] + (aim[0] - from[0]) * k, from[1] + (aim[1] - from[1]) * k, from[2] + (aim[2] - from[2]) * k]
  const d = gaze(next)
  const close = Math.hypot(eye[0] - from[0], eye[1] - from[1], eye[2] - from[2]) < TOO_CLOSE
  return { rig: next, pose: { eye, target: [eye[0] + d[0], eye[1] + d[1], eye[2] + d[2]], close } }
}

export const bob = (t: number, speed: number, top: number, reduced: boolean): number =>
  reduced || top <= 0 ? 0 : BOB * Math.min(1, speed / top) * Math.sin(t * 2 * Math.PI * 1.8)

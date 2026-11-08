export type Vec = Readonly<{ x: number; z: number }>

export type Box = Readonly<{ x: number; z: number; w: number; d: number }>

export type Interactable = Readonly<{ id: string; x: number; z: number; r: number; prompt?: string; note?: string; hold?: number }>

export const RADIUS = 0.35

export const vec = (x: number, z: number): Vec => ({ x, z })

export const add = (a: Vec, b: Vec): Vec => vec(a.x + b.x, a.z + b.z)

export const sub = (a: Vec, b: Vec): Vec => vec(a.x - b.x, a.z - b.z)

export const scale = (a: Vec, k: number): Vec => vec(a.x * k, a.z * k)

export const length = (a: Vec): number => Math.hypot(a.x, a.z)

export const distance = (a: Vec, b: Vec): number => length(sub(a, b))

export const normalize = (a: Vec): Vec => {
  const l = length(a)
  return l > 1e-9 ? scale(a, 1 / l) : vec(0, 0)
}

export const hits = (p: Vec, b: Box, r: number = RADIUS): boolean => {
  const cx = Math.max(b.x - b.w / 2, Math.min(p.x, b.x + b.w / 2))
  const cz = Math.max(b.z - b.d / 2, Math.min(p.z, b.z + b.d / 2))
  return Math.hypot(p.x - cx, p.z - cz) < r
}

export const blocked = (p: Vec, boxes: readonly Box[]): boolean => boxes.some((b) => hits(p, b))

export const step = (pos: Vec, dir: Vec, distanceToGo: number, boxes: readonly Box[]): Vec => {
  const d = scale(normalize(dir), distanceToGo)
  const alongX = vec(pos.x + d.x, pos.z)
  const afterX = blocked(alongX, boxes) ? pos : alongX
  const alongZ = vec(afterX.x, afterX.z + d.z)
  return blocked(alongZ, boxes) ? afterX : alongZ
}

export const move = (pos: Vec, dir: Vec, distanceToGo: number, boxes: readonly Box[]): Vec => {
  const steps = Math.max(1, Math.ceil(distanceToGo / (RADIUS / 2)))
  return Array.from({ length: steps }).reduce<Vec>((p) => step(p, dir, distanceToGo / steps, boxes), pos)
}

export const FOCUS_HALF_ANGLE = (65 * Math.PI) / 180

export const VIEW_WEIGHT = 0.8

export const FACING_WEIGHT = 0.2

const UNDERFOOT = 0.3

export const offAxis = (pos: Vec, yaw: number, at: Vec): number =>
  distance(pos, at) < UNDERFOOT ? 0 : angleBetween(yaw, angleTo(pos, at))

export const pick = (pos: Vec, view: number, facing: number, items: readonly Interactable[]): Interactable | undefined => {
  const score = (i: Interactable): number => distance(pos, i) + VIEW_WEIGHT * offAxis(pos, view, i) + FACING_WEIGHT * offAxis(pos, facing, i)
  return items
    .filter((i) => distance(pos, i) <= i.r && offAxis(pos, view, i) <= FOCUS_HALF_ANGLE)
    .reduce<Interactable | undefined>((best, i) => (!best || score(i) < score(best) ? i : best), undefined)
}

const segmentHitsBox = (a: Vec, b: Vec, box: Box): boolean => {
  const [x0, x1, z0, z1] = [box.x - box.w / 2, box.x + box.w / 2, box.z - box.d / 2, box.z + box.d / 2]
  const d = sub(b, a)
  const slab = (p: number, dp: number, lo: number, hi: number): readonly [number, number] | undefined => {
    if (Math.abs(dp) < 1e-12) return p >= lo && p <= hi ? [-Infinity, Infinity] : undefined
    const [t0, t1] = [(lo - p) / dp, (hi - p) / dp]
    return [Math.min(t0, t1), Math.max(t0, t1)]
  }
  const sx = slab(a.x, d.x, x0, x1)
  const sz = slab(a.z, d.z, z0, z1)
  if (!sx || !sz) return false
  const enter = Math.max(sx[0], sz[0], 0)
  const exit = Math.min(sx[1], sz[1], 1)
  return enter <= exit
}

export const lineOfSight = (from: Vec, to: Vec, occluders: readonly Box[]): boolean =>
  !occluders.some((b) => segmentHitsBox(from, to, b))

export type Watcher = Readonly<{ at: Vec; facing: number; range: number; halfAngle: number }>

export const angleTo = (from: Vec, to: Vec): number => Math.atan2(to.x - from.x, to.z - from.z)

export const angleBetween = (a: number, b: number): number => {
  const d = (((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
  return Math.abs(d)
}

export const sees = (w: Watcher, target: Vec, occluders: readonly Box[]): boolean =>
  distance(w.at, target) <= w.range &&
  angleBetween(w.facing, angleTo(w.at, target)) <= w.halfAngle &&
  lineOfSight(w.at, target, occluders)

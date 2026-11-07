export type Vec = Readonly<{ x: number; z: number }>

export type Box = Readonly<{ x: number; z: number; w: number; d: number }>

export type Interactable = Readonly<{ id: string; x: number; z: number; r: number; prompt: string }>

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

export const nearest = (pos: Vec, items: readonly Interactable[]): Interactable | undefined =>
  items
    .filter((i) => distance(pos, i) <= i.r)
    .reduce<Interactable | undefined>((best, i) => (!best || distance(pos, i) < distance(pos, best) ? i : best), undefined)

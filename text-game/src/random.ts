export const mulberry = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const fmix = (h: number): number => {
  const a = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  const b = Math.imul(a ^ (a >>> 13), 0xc2b2ae35)
  return (b ^ (b >>> 16)) >>> 0
}

export const mixSeed = (...parts: readonly number[]): number =>
  parts.reduce((h, p) => fmix(Math.imul(h ^ fmix(p >>> 0), 0x9e3779b1) ^ Math.floor(p / 4294967296)), 0x811c9dc5)

export const pickIndex = (rnd: () => number, count: number): number => 1 + Math.floor(rnd() * count)

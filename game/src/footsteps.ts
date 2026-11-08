import type { Box, Vec } from './world.ts'

export type Surface = 'wood' | 'gravel' | 'mud' | 'water'

export type Region = Readonly<{ box: Box; surface: Surface }>

export type Ground = Readonly<{ surface: Surface; regions: readonly Region[] }>

export const STRIDE = 0.8

const FIRST = 0.6 * STRIDE

export type Gait = Readonly<{ carry: number; steps: number }>

export const standing: Gait = { carry: FIRST, steps: 0 }

export type Stride = Readonly<{ gait: Gait; falls: number }>

export const pace = (gait: Gait, walked: number, stride: number = STRIDE): Stride => {
  if (!(walked > 1e-4)) return { gait: { ...gait, carry: FIRST }, falls: 0 }
  const carry = gait.carry + walked
  const falls = Math.floor(carry / stride)
  return { gait: { carry: carry - falls * stride, steps: gait.steps + falls }, falls }
}

const inside = (p: Vec, b: Box): boolean => Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.z - b.z) <= b.d / 2

export const surfaceAt = (ground: Ground, p: Vec): Surface =>
  ground.regions.findLast((r) => inside(p, r.box))?.surface ?? ground.surface

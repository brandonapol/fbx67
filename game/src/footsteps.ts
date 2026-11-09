import type { Box, Vec } from './world.ts'

export type Surface = 'wood' | 'gravel' | 'mud' | 'water' | 'snow' | 'concrete'

export type Region = Readonly<{ box: Box; surface: Surface }>

export type Ground = Readonly<{ surface: Surface; regions: readonly Region[]; tempF?: number }>

export const strideFor = (speed: number): number => 0.42 + 0.22 * Math.max(0, speed)

const FIRST = 0.6

export type Gait = Readonly<{ phase: number; steps: number }>

export const standing: Gait = { phase: FIRST, steps: 0 }

export type Stride = Readonly<{ gait: Gait; falls: number }>

export const pace = (gait: Gait, walked: number, dt: number): Stride => {
  if (!(walked > 1e-4) || !(dt > 0)) return { gait: { ...gait, phase: FIRST }, falls: 0 }
  const phase = gait.phase + walked / strideFor(walked / dt)
  const falls = Math.floor(phase)
  return { gait: { phase: phase - falls, steps: gait.steps + falls }, falls }
}

const inside = (p: Vec, b: Box): boolean => Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.z - b.z) <= b.d / 2

export const surfaceAt = (ground: Ground, p: Vec): Surface =>
  ground.regions.findLast((r) => inside(p, r.box))?.surface ?? ground.surface

export const SOFT_SNOW_F = 25

export const SQUEAK_SNOW_F = -10

export type Snow = Readonly<{ squeak: number; freq: number; decay: number; grains: number }>

export const snowAt = (tempF: number | undefined): Snow => {
  const t = Number.isFinite(tempF) ? (tempF as number) : SOFT_SNOW_F
  const squeak = Math.min(1, Math.max(0, (SOFT_SNOW_F - t) / (SOFT_SNOW_F - SQUEAK_SNOW_F)))
  return { squeak, freq: 700 + 1500 * squeak, decay: 0.16 - 0.08 * squeak, grains: 3 + Math.round(4 * squeak) }
}

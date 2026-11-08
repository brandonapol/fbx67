import type { Box, Vec } from './world.ts'

export type Surface = 'wood' | 'gravel' | 'mud' | 'water'

export type Region = Readonly<{ box: Box; surface: Surface }>

export type Ground = Readonly<{ surface: Surface; regions: readonly Region[] }>

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

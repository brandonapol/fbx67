import type { Clock } from '../../text-game/src/types.ts'
import type { Season } from '../../text-game/src/story.ts'
import type { Piece, Rect } from './downtown.ts'
import { FLOAT, PLAY, WATER_EDGE, blocks, buildings } from './downtown.ts'

// The town's seasonal dressing, as data laid over downtown (docs/town-map.md): what is there in every season (parked
// cars, the birches on the bank) and what freeze-up adds, September to November, in the order it comes. The season is
// the story's (season(state) from clock(state)); the stage within freeze-up is the scene's date. Winter keeps every
// freeze-up layer. Nothing here is solid but the cars and the trunks, so the season never changes where a player can walk.

// Freeze-up in stages, by [month, day]: ice skims the puddles first, the birches drop their leaves, the first snow
// stays and the cars go on their plug-ins, then the river skims over. Plausible for Fairbanks, not archival.
export type Stage = 'frost' | 'bare' | 'snow' | 'skim'

export const STAGES: readonly (readonly [Stage, number, number])[] = [
  ['frost', 9, 1],
  ['bare', 9, 21],
  ['snow', 10, 10],
  ['skim', 10, 25],
]

const order: readonly Stage[] = STAGES.map(([s]) => s)

const dayOf = (c: Clock): number => {
  const [, m, d] = c.split('T')[0]!.split('-').map(Number)
  return m! * 100 + d!
}

// The freeze-up stage a season and date show: none before freeze-up, every layer in deep winter (and in breakup, which
// has no layer of its own yet). A freeze-up scene with no clock shows the first stage.
export const stageOf = (season: Season, clock?: Clock): Stage | undefined => {
  if (season === 'summer' || season === 'flood') return undefined
  if (season !== 'freezeup') return 'skim'
  if (clock === undefined) return 'frost'
  const at = dayOf(clock)
  return STAGES.findLast(([, m, d]) => at >= m * 100 + d)?.[0] ?? 'frost'
}

const reached = (stage: Stage | undefined, from: Stage): boolean => stage !== undefined && order.indexOf(stage) >= order.indexOf(from)

const rect = (r: Rect) => ({ x: (r[0] + r[1]) / 2, z: (r[2] + r[3]) / 2, w: r[1] - r[0], d: r[3] - r[2] })

// Cars parked along the curbs, clear of the walks the prologue's legs follow, the doors and the spawns. `curb` is the
// roadway's edge on the car's walk side; `side` is -1 when that walk is north of the road (smaller z), 1 when south.
type Car = Readonly<{ x: number; curb: number; side: -1 | 1; color: string }>

const CAR_L = 4.8
const CAR_W = 1.8

export const cars: readonly Car[] = [
  { x: 14, curb: 52, side: -1, color: '#6b7a6e' },
  { x: 46, curb: 52, side: -1, color: '#8a7a5c' },
  { x: 62, curb: 52, side: -1, color: '#5a6578' },
  { x: 96, curb: 52, side: -1, color: '#b0a890' },
  { x: 130, curb: 52, side: -1, color: '#7a4a3a' },
  { x: -20, curb: 60, side: 1, color: '#5a6578' },
  { x: 30, curb: 60, side: 1, color: '#9a9488' },
  { x: 140, curb: 60, side: 1, color: '#6b7a6e' },
  { x: 22, curb: 107, side: 1, color: '#8a7a5c' },
  { x: 60, curb: 107, side: 1, color: '#4e5a52' },
  { x: 104, curb: 107, side: 1, color: '#7a4a3a' },
  { x: 32, curb: 13, side: 1, color: '#b0a890' },
]

const carZ = (c: Car): number => c.curb - c.side * (CAR_W / 2 + 0.2)

const car = (c: Car): readonly Piece[] => [
  { box: { x: c.x, z: carZ(c), w: CAR_L, d: CAR_W }, h: 0.95, y: 0.2, color: c.color, solid: true },
  { box: { x: c.x - 0.3, z: carZ(c), w: 2.4, d: CAR_W - 0.2 }, h: 0.5, y: 1.15, color: c.color },
]

// Paper birches on the riverbank between First Avenue and the water, off the float's approach.
export const birches: readonly (readonly [number, number])[] = [
  [-45, -3],
  [-30, -4],
  [15, -3],
  [70, -4],
  [86, -3],
  [140, -4],
  [176, -3],
]

const TRUNK_H = 6
const trunk = ([x, z]: readonly [number, number]): Piece => ({
  box: { x, z, w: 0.32, d: 0.32 },
  h: TRUNK_H,
  color: '#d9d4c8',
  solid: true,
  shape: 'cylinder',
})

const leaves = { summer: '#5b7a3a', turned: '#c9a83a' } as const

// In leaf the crown is a full mass; bare, it is a thin dark haze of twigs around the top of the trunk.
const crown = ([x, z]: readonly [number, number], stage: Stage | undefined): Piece =>
  reached(stage, 'bare')
    ? { box: { x, z, w: 1.5, d: 1.5 }, h: 3.4, y: 2.8, color: '#6e6058', shape: 'cone' }
    : { box: { x, z, w: 3, d: 3 }, h: 3.8, y: 2.6, color: stage === 'frost' ? leaves.turned : leaves.summer, shape: 'cylinder' }

// What every season has: the cars and the birch trunks.
export const standing: readonly Piece[] = [...cars.flatMap(car), ...birches.map(trunk)]

// Ice skimming the puddles on the gravel: Noble Street, the alley and the lane by the Silver Pan. It sits above the
// roadway (0.03) and below the walks (0.06).
export const puddles: readonly Rect[] = [
  [158.5, 161, 28, 29.4],
  [161, 163.5, 70, 71.2],
  [157.5, 160, 90, 91.6],
  [40, 42.4, 24, 25.2],
  [40.5, 43, 40, 41.4],
  [60, 62.6, 79.2, 80.6],
  [100, 102.2, 79.4, 80.8],
  [20, 22.8, 79.3, 80.5],
]

const ICE = '#c4d2da'
const SNOW = '#dfe2e6'

const puddle = (r: Rect): Piece => ({ box: rect(r), h: 0.04, color: ICE, flat: true })

// Woodsmoke and furnace smoke from the low buildings, a short stack at the back of each roof and a rising, paling column.
// Smoke, snow, cords and skim ice are `flat`: they cast no shadow, which keeps the late-fall town inside its budget.
const smoky = buildings.filter((b) => b.h <= 11)

const smoke = (b: (typeof buildings)[number]): readonly Piece[] => {
  const [x0, x1, z0] = b.rect
  const x = x0 + Math.min(3, (x1 - x0) / 3)
  const z = z0 + 2
  return [
    { box: { x, z, w: 0.5, d: 0.5 }, h: 1.1, y: b.h, color: '#6a4e40' },
    { box: { x, z, w: 0.7, d: 0.7 }, h: 1.4, y: b.h + 1.1, color: '#9c9a98', shape: 'cylinder', flat: true },
    { box: { x: x + 0.3, z, w: 1.2, d: 1.2 }, h: 1.6, y: b.h + 2.5, color: '#b4b2b0', shape: 'cylinder', flat: true },
    { box: { x: x + 0.8, z, w: 1.9, d: 1.9 }, h: 1.8, y: b.h + 4.1, color: '#c8c6c4', shape: 'cylinder', flat: true },
  ]
}

// The first snow that stays: on the open lots (under the roadways and walks, which traffic and shovels keep bare) and
// on every roof.
const roofs: readonly Piece[] = [
  ...buildings.map((b) => ({ r: b.rect, h: b.h })),
  ...blocks.map((b) => ({ r: [b.rect[0] + 0.1, b.rect[1] - 0.1, b.rect[2] + 0.1, b.rect[3] - 0.1] as const, h: 3.5 })),
].map(({ r, h }): Piece => ({ box: rect([r[0] + 0.05, r[1] - 0.05, r[2] + 0.05, r[3] - 0.05]), h: 0.08, y: h, color: SNOW, flat: true }))

const lots: Piece = { box: rect([PLAY[0], PLAY[1], 0, PLAY[3]]), h: 0.02, color: SNOW, flat: true }

// Each car's cord from its grille to a plug-in post at the walk's edge.
const cord = (c: Car): readonly Piece[] => {
  const x = c.x + CAR_L / 2 + 0.25
  const post = c.curb + c.side * 0.4
  const from = carZ(c)
  return [
    { box: { x, z: post, w: 0.12, d: 0.12 }, h: 1.1, color: '#4a4440' },
    { box: { x, z: (from + post) / 2, w: 0.04, d: Math.abs(post - from) }, h: 0.04, y: 0.45, color: '#1e1e1e', flat: true },
  ]
}

// The river skimming over: shelf ice out from the bank, and pans drifting in the channel.
const pans: readonly (readonly [number, number, number])[] = [
  [-30, -24, 4],
  [-5, -32, 3],
  [20, -21, 5],
  [48, -38, 3.5],
  [75, -26, 4.5],
  [90, -46, 3],
  [135, -30, 5],
  [160, -22, 3.5],
  [185, -40, 4],
]

const river: readonly Piece[] = [
  ...([
    [PLAY[0] - 40, FLOAT[0], WATER_EDGE - 4, WATER_EDGE],
    [FLOAT[1], PLAY[1] + 40, WATER_EDGE - 4, WATER_EDGE],
  ] as const).map((r): Piece => ({ box: rect(r), h: 0.025, color: '#d6dde2', flat: true })),
  ...pans.map(([x, z, w]): Piece => ({ box: { x, z, w, d: w * 0.7 }, h: 0.025, color: '#cfd7dc', flat: true, shape: 'cylinder' })),
]

// The season's layer over the town: the birch crowns in every season, and each freeze-up stage reached.
export const townLayer = (season: Season, clock?: Clock): readonly Piece[] => {
  const stage = stageOf(season, clock)
  return [
    ...birches.map((b) => crown(b, stage)),
    ...(reached(stage, 'frost') ? [...puddles.map(puddle), ...smoky.flatMap(smoke)] : []),
    ...(reached(stage, 'snow') ? [lots, ...roofs, ...cars.flatMap(cord)] : []),
    ...(reached(stage, 'skim') ? river : []),
  ]
}

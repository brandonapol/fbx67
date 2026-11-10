import type { Prop } from './levels.ts'
import type { Chart, Way } from './pocketMapCharts.ts'
import { townChart } from './pocketMapCharts.ts'
import type { Vec } from './world.ts'
import { distance, vec } from './world.ts'

// Street-name signs (issue #303): a gray-box post at every corner where an avenue crosses a street downtown, the two
// names on two blades, so the pocket map is learnable on foot. The corners and the names are the town chart's
// (pocketMapCharts.ts, from docs/town-map.md); nothing is placed by hand. The post stands on the southeast corner's
// walk, a step back from both curbs. streetSignsView.ts writes the names over the blades.

export type Sign = Readonly<{ id: string; at: Vec; avenue: Way; street: Way; texts: readonly [string, string] }>

// How far back from each curb the post stands, on the corner's walk.
export const CURB_SET = 1.2
export const POST_H = 2.9
const POST_W = 0.14
const BLADE_LONG = 1.6
const BLADE_H = 0.22
const BLADE_T = 0.04
export const BLADE_Y: readonly [number, number] = [2.42, 2.66]

const overlap = (a0: number, a1: number, b0: number, b1: number): boolean => a0 < b1 && b0 < a1

// Two ways cross where each one's roadway runs into the other's.
export const crosses = (a: Way, s: Way): boolean => overlap(a.road[0], a.road[1], s.road[0], s.road[1]) && overlap(a.road[2], a.road[3], s.road[2], s.road[3])

// What a blade says: the name in capitals, the kind abbreviated, as a city sign of the period writes it.
export const bladeText = (name: string): string => name.replace(/ Avenue$/, ' Ave').replace(/ Street$/, ' St').replace(/ Road$/, ' Rd').toUpperCase()

export const signsOn = (c: Chart): readonly Sign[] =>
  c.ways
    .filter((a) => a.runs === 'ew')
    .flatMap((a) =>
      c.ways
        .filter((s) => s.runs === 'ns' && crosses(a, s))
        .map((s) => ({
          id: `${s.short}@${a.short}`,
          at: vec(s.road[1] + CURB_SET, a.road[3] + CURB_SET),
          avenue: a,
          street: s,
          texts: [bladeText(a.name), bladeText(s.name)] as const,
        })),
    )

export const signs: readonly Sign[] = signsOn(townChart)

const POST = '#6f6d68'
const BLADE = '#3d5a48'

// The post, solid, and its two blades: the avenue's along x, the street's along z, one over the other.
export const signProps = (s: Sign): readonly Prop[] => [
  { box: { x: s.at.x, z: s.at.z, w: POST_W, d: POST_W }, h: POST_H, color: POST, solid: true },
  { box: { x: s.at.x, z: s.at.z, w: BLADE_LONG, d: BLADE_T }, h: BLADE_H, y: BLADE_Y[0], color: BLADE },
  { box: { x: s.at.x, z: s.at.z, w: BLADE_T, d: BLADE_LONG }, h: BLADE_H, y: BLADE_Y[1], color: BLADE },
]

export const streetSigns: readonly Prop[] = signs.flatMap(signProps)

// How close the player must be to read a sign's blades.
export const READ_WITHIN = 18

// The signs near enough to read from p, nearest first.
export const readable = (p: Vec, all: readonly Sign[] = signs): readonly Sign[] =>
  all
    .map((s) => [s, distance(s.at, p)] as const)
    .filter(([, d]) => d <= READ_WITHIN)
    .sort((a, b) => a[1] - b[1])
    .map(([s]) => s)

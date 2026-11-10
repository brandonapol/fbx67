import type { Clock, SceneId, State } from '../../text-game/src/types.ts'
import type { Season } from '../../text-game/src/story.ts'
import type { Figure, Prop, Space } from './levels.ts'
import { vec } from './world.ts'

// St. Joseph's after the water: the hospital took water on its first floor and sent everyone it could carry up the
// hill, so its patients and the nurses who stayed work from the help tent on the high ground south of town (place
// `helpTent`, off the walkable town map; docs/town-map.md, design.md). Local x east, z south. Wade comes in at the
// flap on the south side; the cots run down the north and west sides; Owen is on the last cot at the back, east,
// under a tarp, and Joan is still at it.
//
// What is said comes from the story's menu: Barnette's ruling and Joan's clue are the scenes' own text, shown when
// Wade talks to her. The room only says where each beat happens (BEATS), never what it means.

const W = 12
const D = 9

export const FLAP_AT = vec(0, D / 2 - 0.5)
export const SPAWN = vec(0, D / 2 - 1.1)
export const JOAN_AT = vec(3.0, -2.2)
export const OWEN_COT_AT = vec(4.3, -3.2)

// Where each Act 1 beat at the tent happens (docs/acts/act1.md): the morning errand, the ruling and her answer at
// Joan; on the laugh path she catches Wade's sleeve on his way out, at the flap.
export const BEATS: Readonly<Partial<Record<SceneId, 'joan' | 'flap'>>> = {
  a1_errand: 'joan',
  a1_ruling: 'joan',
  a1_joan_ask: 'joan',
  a1_joan_laugh: 'flap',
}

export const tentSpot = (s: State, id: string): boolean => BEATS[s.scene] === id

const canvas = '#8f8a6c'
const olive = '#5f6247'
const blanket = '#7a6f5c'

const wall = (x: number, z: number, w: number, d: number): Prop => ({ box: { x, z, w, d }, h: 2.6, color: canvas, solid: true, occludes: true })

const cot = (x: number, z: number, along: 'x' | 'z' = 'z'): readonly Prop[] => {
  const [w, d] = along === 'z' ? [0.75, 1.9] : [1.9, 0.75]
  return [
    { box: { x, z, w, d }, h: 0.42, color: olive, solid: true },
    { box: { x, z, w: w - 0.1, d: d - 0.3 }, h: 0.06, y: 0.42, color: blanket },
  ]
}

const props: readonly Prop[] = [
  // The canvas, with the flap's gap in the south wall.
  wall(0, -D / 2, W, 0.2),
  wall(-W / 2, 0, 0.2, D),
  wall(W / 2, 0, 0.2, D),
  wall(-W / 4 - 0.35, D / 2, W / 2 - 0.7, 0.2),
  wall(W / 4 + 0.35, D / 2, W / 2 - 0.7, 0.2),
  { box: { x: -0.55, z: D / 2 + 0.05, w: 0.5, d: 0.06 }, h: 2.2, color: '#7e795e' },
  // The ridge pole and its two uprights.
  { box: { x: 0, z: 0, w: W - 0.4, d: 0.1 }, h: 0.1, y: 3.1, color: '#5a4630' },
  { box: { x: -3, z: 0, w: 0.12, d: 0.12 }, h: 3.1, color: '#5a4630', shape: 'cylinder', solid: true },
  { box: { x: 3, z: 0, w: 0.12, d: 0.12 }, h: 3.1, color: '#5a4630', shape: 'cylinder', solid: true },
  // The cots: down the north side and the west side.
  ...[-4.6, -3.4, -2.2, -1.0, 0.2, 1.4, 2.6].flatMap((x) => cot(x, -3.35)),
  ...[-1.2, 0.4, 1.9].flatMap((z) => cot(-4.95, z, 'x')),
  // The last cot at the back, where Owen is laid.
  ...cot(OWEN_COT_AT.x, OWEN_COT_AT.z),
  // The crate of bottles out of the hospital pharmacy, and the table Joan counts pills on.
  { box: { x: -4.4, z: 3.4, w: 0.9, d: 0.6 }, h: 0.55, color: '#7a5a38', solid: true },
  { box: { x: 2.4, z: 2.8, w: 1.4, d: 0.7 }, h: 0.76, color: '#6a5238', solid: true, occludes: true },
  { box: { x: 2.1, z: 2.8, w: 0.3, d: 0.2 }, h: 0.01, y: 0.76, color: '#efe6cf' },
  // Two lanterns on the uprights: it is night.
  { box: { x: -3, z: 0.15, w: 0.14, d: 0.14 }, h: 0.22, y: 1.9, color: '#ffc27a', glow: true },
  { box: { x: 3, z: 0.15, w: 0.14, d: 0.14 }, h: 0.22, y: 1.9, color: '#ffc27a', glow: true },
]

// The dressing chosen by the story's season, as data: August's flood leaves mud tracked in from the flap, wet boots
// and a drip bucket under the seam. Act 3 brings St. Joseph's back in deep winter (#145); its dressing goes in
// `winter`, empty until then. A season with no entry shows the bare space.
export const dressing: Readonly<Partial<Record<Season, readonly Prop[]>>> = {
  flood: [
    { box: { x: 0, z: 2.6, w: 1.6, d: 3.4 }, h: 0.01, color: '#4a3e2c', flat: true },
    { box: { x: 1.6, z: -0.6, w: 1.2, d: 2.6 }, h: 0.01, color: '#4f4330', flat: true },
    ...[-2.6, -2.25, -1.9].map((x): Prop => ({ box: { x, z: 4.1, w: 0.22, d: 0.32 }, h: 0.3, color: '#2e2a24' })),
    { box: { x: 0.9, z: -1.4, w: 0.3, d: 0.3 }, h: 0.32, color: '#6e7074', shape: 'cylinder' },
  ],
  winter: [],
}

export const dressedFor = (season: Season | undefined): readonly Prop[] => (season === undefined ? [] : (dressing[season] ?? []))

// Owen under a tarp on the last cot, from the evening of the 15th, when Wade and Eli bring him in from the boat; on
// the errand that morning the cot is empty. Clocks in one format compare as strings.
export const BODY_IN: Clock = '1967-08-15T18:00'

const tarp: Prop = { box: { x: OWEN_COT_AT.x, z: OWEN_COT_AT.z, w: 0.6, d: 1.75 }, h: 0.22, y: 0.42, color: '#4d5448' }

export const bodyIn = (season: Season, clock: Clock | undefined): boolean => season === 'flood' && clock !== undefined && clock >= BODY_IN

// The tent as a season and a clock show it: its own props when nothing is added, so collision reads the same props.
export const tentProps = (props: readonly Prop[], season: Season, clock?: Clock): readonly Prop[] => {
  const extra = [...dressedFor(season), ...(bodyIn(season, clock) ? [tarp] : [])]
  return extra.length ? [...props, ...extra] : props
}

const figures: readonly Figure[] = [
  { id: 'joan', at: JOAN_AT, facing: Math.PI * 0.75, coat: '#e8e4d8', skin: '#e6c0a0', hair: '#6b4a2e', height: 1.66 },
  { id: 'eli', at: vec(5.1, -1.7), facing: -Math.PI * 0.85, coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 },
  { id: 'patient', at: vec(-4.95, 0.4), facing: Math.PI / 2, coat: '#c9c6bb', skin: '#dcb08a', hair: '#bdb8ae', height: 1.7, activity: 'sit' },
]

export const helpTent: Space = {
  id: 'helpTent',
  act: 'Act 1: Flood',
  place: 'helpTent',
  name: 'The help tent',
  interior: true,
  size: { w: W, d: D },
  ground: '#6a5f4a',
  spawn: SPAWN,
  props,
  figures,
  spots: [
    { id: 'joan', x: JOAN_AT.x, z: JOAN_AT.z, r: 1.9, prompt: 'Talk to the nurse' },
    { id: 'flap', x: FLAP_AT.x, z: FLAP_AT.z, r: 1.4, prompt: 'Head out' },
  ],
}

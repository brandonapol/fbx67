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
  // What the hospital sent up with its patients, against the canvas: more of the pharmacy's crates, the ward's
  // mattresses stacked under a tarp, the stretcher stood on end, a wheelchair, the wash stand and its water.
  { box: { x: -5.25, z: 3.35, w: 0.6, d: 0.6 }, h: 1.1, color: '#7a5a38', solid: true },
  { box: { x: 4.6, z: 3.85, w: 1.9, d: 0.8 }, h: 0.6, color: '#c9c1aa', solid: true },
  { box: { x: 4.6, z: 3.85, w: 1.95, d: 0.85 }, h: 0.05, y: 0.6, color: '#4d5448' },
  { box: { x: 5.7, z: -0.1, w: 0.1, d: 0.6 }, h: 2.0, color: '#7a6a4c', solid: true },
  { box: { x: 4.3, z: 2.4, w: 0.6, d: 0.6 }, h: 0.5, color: '#4a4a46', solid: true },
  { box: { x: 4.3, z: 2.68, w: 0.6, d: 0.06 }, h: 0.5, y: 0.5, color: '#4a4a46' },
  { box: { x: 4.3, z: 2.4, w: 0.66, d: 0.66 }, h: 0.05, y: 0.08, color: '#2c2c2a', shape: 'cylinder' },
  { box: { x: 5.45, z: 1.0, w: 0.6, d: 0.9 }, h: 0.8, color: '#6a5238', solid: true },
  { box: { x: 5.45, z: 0.85, w: 0.4, d: 0.4 }, h: 0.1, y: 0.8, color: '#d8d6cc', shape: 'cylinder' },
  { box: { x: 5.45, z: 1.25, w: 0.16, d: 0.16 }, h: 0.28, y: 0.8, color: '#d8d6cc', shape: 'cylinder' },
  ...[2.0, 2.45].map((z): Prop => ({ box: { x: 5.55, z, w: 0.2, d: 0.36 }, h: 0.47, color: '#55603f', solid: true })),
  // Two lanterns on the uprights: it is night.
  { box: { x: -3, z: 0.15, w: 0.14, d: 0.14 }, h: 0.22, y: 1.9, color: '#ffc27a', glow: true },
  { box: { x: 3, z: 0.15, w: 0.14, d: 0.14 }, h: 0.22, y: 1.9, color: '#ffc27a', glow: true },
]

// The dressing, piece by piece, named the way #171 asks for the tent: dripping, emptied, cots down the hall. St.
// Joseph's emptied its first floor up the hill, so what came with the patients is here: the pharmacy's crates, the
// ward's mattresses and a wheelchair, a stretcher, the patients' bags under their cots. The canvas drips along the
// ridge seam into buckets. Gray-box primitives only (docs/art/assets.md); nothing carries lettering. None of it is
// solid: the tent's season layer adds nothing to collision (levels.ts), so everything here sits on a cot, on Joan's
// table, under a solid, or against the canvas off every way Wade walks (hospital.test.ts holds it to that).

const NORTH_COTS = [-4.6, -3.4, -2.2, -1.0, 0.2, 1.4, 2.6]
const WEST_COTS = [-1.2, 0.4, 1.9]
const NORTH_Z = -3.35
const WEST_X = -4.95

const flat = (x: number, z: number, w: number, d: number, color: string): Prop => ({ box: { x, z, w, d }, h: 0.01, color, flat: true })
const on = (x: number, z: number, w: number, d: number, y: number, h: number, color: string, shape?: 'cylinder'): Prop => ({
  box: { x, z, w, d },
  h,
  y,
  color,
  ...(shape ? { shape } : {}),
})
const can = (x: number, z: number, r: number, h: number, color: string, y = 0): Prop => on(x, z, r, r, y, h, color, 'cylinder')

const water = '#3b3f3e'
const wetMud = '#4a3e2c'
const linen = '#d9d3c2'
const enamel = '#d8d6cc'
const bagColors = ['#5b4a36', '#3f4a3a', '#6b5a48', '#4a3b30']

// Where the ridge seam leaks: under it, a bucket or a puddle, and the drop falling.
const DRIPS: readonly (readonly [number, number])[] = [[-4.2, 0.1], [-1.6, -0.1], [0.9, -1.4], [4.4, 0.2], [-0.4, -1.7]]

export const pieces: Readonly<Record<string, readonly Prop[]>> = {
  // Mud tracked in from the flap and down to the last cot.
  mud: [flat(0, 2.6, 1.6, 3.4, wetMud), flat(1.6, -0.6, 1.2, 2.6, '#4f4330'), flat(3.4, -1.6, 1.4, 1.0, wetMud)],
  // Planks laid over the worst of it, from the flap in.
  duckboards: [0.9, 1.7, 2.5, 3.3, 4.0].map((z) => ({ ...flat(0, z, 1.1, 0.5, '#6b5a42'), h: 0.03 })),
  // Sandbags each side of the flap, where the water was meant to stop.
  sandbags: [-1.5, -1.05, 1.05, 1.5].flatMap((x) => [on(x, 4.15, 0.42, 0.28, 0, 0.16, '#8a7b5a'), on(x + 0.2, 4.15, 0.42, 0.28, 0.16, 0.15, '#857656')]),
  // The ridge seam drips: the drop, the bucket under it, the puddle round it, and the stain on the canvas above.
  drips: DRIPS.map(([x, z]) => on(x, z, 0.03, 0.03, 1.6, 0.16, '#a9b4b8', 'cylinder')),
  buckets: DRIPS.filter((_, i) => i % 2 === 0).map(([x, z]) => can(x, z, 0.3, 0.32, '#6e7074')),
  puddles: DRIPS.map(([x, z], i) => flat(x + 0.1, z + 0.1, 0.9 + (i % 2) * 0.4, 0.7, water)),
  stains: [-4.4, -1.6, 1.2, 4.0].map((x, i) => on(x, -4.36, 1.1 + (i % 2) * 0.5, 0.02, 1.2, 1.3, '#6f6a50')),
  // Each cot made up: a pillow at the head, a blanket folded at the foot.
  pillows: [
    ...NORTH_COTS.map((x) => on(x, NORTH_Z - 0.7, 0.55, 0.32, 0.48, 0.1, linen)),
    ...WEST_COTS.map((z) => on(WEST_X - 0.7, z, 0.32, 0.55, 0.48, 0.1, linen)),
  ],
  blankets: [
    ...NORTH_COTS.map((x) => on(x, NORTH_Z + 0.75, 0.6, 0.3, 0.48, 0.12, '#6f6556')),
    ...WEST_COTS.map((z) => on(WEST_X + 0.75, z, 0.3, 0.6, 0.48, 0.12, '#6f6556')),
  ],
  // What the patients carried up, under their cots.
  bags: [
    ...NORTH_COTS.map((x, i) => on(x + 0.05, NORTH_Z + 0.2, 0.5, 0.32, 0, 0.3, bagColors[i % bagColors.length])),
    ...WEST_COTS.map((z, i) => on(WEST_X + 0.2, z, 0.32, 0.5, 0, 0.3, bagColors[(i + 1) % bagColors.length])),
  ],
  bedpans: NORTH_COTS.filter((_, i) => i % 2 === 1).map((x) => on(x - 0.1, NORTH_Z - 0.5, 0.36, 0.26, 0, 0.08, enamel)),
  // An upturned box between each pair of north cots, a basin or a cup on it.
  nightstands: NORTH_COTS.slice(1).map((x) => on(x - 0.6, -3.95, 0.36, 0.34, 0, 0.42, '#7a5a38')),
  basins: NORTH_COTS.slice(1).map((x, i) => can(x - 0.6, -3.95, i % 2 ? 0.1 : 0.3, i % 2 ? 0.12 : 0.08, enamel, 0.42)),
  // The drips over the cots that still have someone on them.
  ivStands: [-3.4, -1.0, 1.4].flatMap((x) => [can(x + 0.5, -2.6, 0.04, 1.75, '#9a9a96'), can(x + 0.5, -2.6, 0.12, 0.2, '#c9d2cf', 1.55)]),
  // Shoes and boots set by the cots, and the row by the flap.
  boots: [
    ...[-2.6, -2.25, -1.9].map((x) => on(x, 4.1, 0.22, 0.32, 0, 0.3, '#2e2a24')),
    ...[-4.6, -2.2, 0.2].flatMap((x) => [on(x - 0.15, -2.25, 0.14, 0.28, 0, 0.16, '#3a3028'), on(x + 0.05, -2.25, 0.14, 0.28, 0, 0.16, '#3a3028')]),
  ],
  // Joan's table: the basin, the ledger, a tray of bottles, her own lamp.
  joansTable: [
    can(2.85, 2.75, 0.4, 0.1, enamel, 0.76),
    on(1.95, 3.0, 0.32, 0.24, 0.77, 0.04, '#3b3226'),
    on(2.45, 2.6, 0.45, 0.3, 0.77, 0.03, '#9a9890'),
    ...[2.3, 2.4, 2.5, 2.6].map((x, i) => can(x, 2.6, 0.06, 0.12 + (i % 2) * 0.03, i % 2 ? '#6a4a24' : '#3d5a54', 0.8)),
    { ...can(3.0, 3.0, 0.16, 0.26, '#ffc27a', 0.77), glow: true },
  ],
  chairs: [on(2.4, 3.55, 0.42, 0.42, 0, 0.45, '#5a4630'), on(2.4, 3.74, 0.42, 0.05, 0.45, 0.45, '#5a4630')],
  // Joan cleaning up: the mop in its bucket in the corner at the end of the row.
  mop: [can(-5.45, -2.0, 0.32, 0.3, '#6e7074'), can(-5.35, -2.0, 0.04, 1.35, '#8a6a44')],
  // Sheets drying on a line along the east canvas.
  clothesline: [
    on(5.75, 1.6, 0.02, 4.4, 1.95, 0.02, '#c8c0aa'),
    ...[0.0, 1.0, 2.0, 3.0].map((z, i) => on(5.72, z, 0.03, 0.8, 1.15 + (i % 2) * 0.1, 0.8 - (i % 2) * 0.1, i % 2 ? '#cfc8b6' : linen)),
  ],
  // The sisters' crucifix, brought up from the ward and hung over the cots.
  crucifix: [on(-1.6, -4.37, 0.06, 0.02, 1.75, 0.5, '#5a4630'), on(-1.6, -4.37, 0.32, 0.02, 2.05, 0.06, '#5a4630')],
  // Drinking water in cans by the flap, and the laundry basket under the line.
  water: [2.95, 3.3].map((x) => on(x, 4.15, 0.2, 0.36, 0, 0.47, '#55603f')),
  laundry: [on(5.3, 3.1, 0.6, 0.4, 0, 0.32, '#9a8458')],
  // Coats and a stethoscope hung on the uprights.
  hooks: [on(-3, 0.12, 0.3, 0.12, 1.2, 0.6, '#5a4f3c'), on(3, -0.12, 0.28, 0.12, 1.25, 0.55, '#e8e4d8')],
  // On and beside the pharmacy's crates by the flap: blankets, a kit, the kerosene.
  crateTops: [
    on(-4.4, 3.4, 0.7, 0.5, 0.55, 0.2, '#7a6f5c'),
    on(-5.25, 3.35, 0.6, 0.45, 1.1, 0.2, '#efe6cf'),
    can(-3.75, 3.7, 0.24, 0.36, '#7a3a2a'),
  ],
  // Boxes of wet charts carried out of the records room, in the back corner past the last cot.
  records: [-3.85, -3.3, -2.75].map((z, i) => on(5.5, z, 0.36, 0.5, 0, 0.3 + (i % 2) * 0.06, i % 2 ? '#8a7e66' : '#7e735c')),
}

// The dressing chosen by the story's season, as data: August's flood is everything above. Act 3 brings St. Joseph's
// back in deep winter (#145); its dressing goes in `winter`, empty until then. A season with no entry shows the bare
// space.
export const dressing: Readonly<Partial<Record<Season, readonly Prop[]>>> = {
  flood: Object.values(pieces).flat(),
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

import type { Place } from '../../text-game/src/types.ts'
import type { Interactable, Vec } from './world.ts'
import { vec } from './world.ts'

// Downtown Fairbanks, summer 1967, as a gray box: streets, walks, block massing, the river edge and the Cushman
// Street bridge, in the meters of docs/town-map.md. Every coordinate here is a world coordinate off that map:
// x east, z south, origin at the bridge's south end. Pass 1 is flat: Owen walks at y 0, and the grade, the bank's
// slope and the bridge's crown are drawn flat until the building kit (issue #41, pass 2).

// A rectangle as the map writes it: x0..x1, z0..z1.
export type Rect = readonly [number, number, number, number]

type Kind = 'ground' | 'solid' | 'blocker'

// What the space needs from a prop, kept structural so this file does not import levels.ts (which imports it).
export type Piece = Readonly<{
  box: Readonly<{ x: number; z: number; w: number; d: number }>
  h: number
  y?: number
  color: string
  solid?: boolean
  occludes?: boolean
  flat?: boolean
  shape?: 'box' | 'cylinder' | 'cone'
}>

const box = (r: Rect) => ({ x: (r[0] + r[1]) / 2, z: (r[2] + r[3]) / 2, w: r[1] - r[0], d: r[3] - r[2] })

const piece = (r: Rect, h: number, color: string, kind: Kind, y?: number): Piece => ({
  box: box(r),
  h,
  color,
  ...(y === undefined ? {} : { y }),
  ...(kind === 'ground' ? { flat: true } : { solid: true }),
  ...(kind === 'solid' ? { occludes: true } : {}),
})

export const PLAY: Rect = [-55, 195, -60, 140]

export const CENTER = vec((PLAY[0] + PLAY[1]) / 2, (PLAY[2] + PLAY[3]) / 2)

export const SIZE = { w: PLAY[1] - PLAY[0], d: PLAY[3] - PLAY[2] } as const

const color = {
  lot: '#6c665a',
  paved: '#4b4b4d',
  gravel: '#857d6d',
  walk: '#a19d94',
  boards: '#7a6248',
  water: '#3d5561',
  bank: '#5d6648',
  deck: '#8e8c86',
  rail: '#5f5d58',
  block: '#8a8782',
  named: '#9b978f',
  brick: '#8f7f72',
  slab: '#a8a59e',
  door: '#2c2622',
  backdrop: '#77756f',
} as const

// Surface heights, stacked so no two flat pieces share a top.
const ROAD = 0.03
const WALK = 0.06
const BOARDS = 0.09

type Span = readonly [number, number]

// The pieces of lo..hi left after cutting out every span in cuts.
export const gaps = (lo: number, hi: number, cuts: readonly Span[]): readonly Span[] => {
  const sorted = [...cuts].filter(([a, b]) => b > lo && a < hi).sort((a, b) => a[0] - b[0])
  const out = sorted.reduce<{ at: number; spans: Span[] }>(
    (acc, [a, b]) => ({ at: Math.max(acc.at, b), spans: a > acc.at ? [...acc.spans, [acc.at, a] as const] : acc.spans }),
    { at: lo, spans: [] },
  )
  return out.at < hi ? [...out.spans, [out.at, hi]] : out.spans
}

// An avenue runs east-west: its right of way and roadway in z, its extent in x.
type Avenue = Readonly<{ name: string; row: Span; road: Span; x: Span }>
// A street runs north-south: right of way and roadway in x, extent in z.
type Street = Readonly<{ name: string; row: Span; road: Span; z: Span; surface: 'paved' | 'gravel'; walks: 'concrete' | 'boards' }>

export const avenues: readonly Avenue[] = [
  { name: 'First Avenue', row: [2, 16], road: [5, 13], x: [PLAY[0], PLAY[1]] },
  { name: 'Second Avenue', row: [48, 64], road: [52, 60], x: [PLAY[0], PLAY[1]] },
  { name: 'Third Avenue', row: [96, 110], road: [99, 107], x: [PLAY[0], PLAY[1]] },
  { name: 'Fourth Avenue', row: [124, 134], road: [126, 132], x: [-40, 40] },
]

export const streets: readonly Street[] = [
  { name: 'Cushman Street', row: [-7, 7], road: [-4, 4], z: [2, PLAY[3]], surface: 'paved', walks: 'concrete' },
  { name: 'Lacey Street', row: [74, 88], road: [77, 85], z: [2, 110], surface: 'paved', walks: 'concrete' },
  { name: 'Noble Street', row: [154, 168], road: [157, 165], z: [2, 110], surface: 'gravel', walks: 'boards' },
]

const inX = (s: Street, a: Avenue): boolean => s.row[0] < a.x[1] && s.row[1] > a.x[0]
const inZ = (a: Avenue, s: Street): boolean => a.row[0] < s.z[1] && a.row[1] > s.z[0]

// Avenue roadways run unbroken; cross-street roadways stop at them. Avenue walks run to the cross street's roadway, so
// they cover the corners; cross-street walks stop at the avenue's right of way. No two pieces overlap.
const avenuePieces = (a: Avenue): readonly Piece[] => {
  const cuts = streets.filter((s) => inX(s, a)).map((s) => s.road)
  const walks = gaps(a.x[0], a.x[1], cuts).flatMap(([x0, x1]): Piece[] => [
    piece([x0, x1, a.row[0], a.road[0]], WALK, color.walk, 'ground'),
    piece([x0, x1, a.road[1], a.row[1]], WALK, color.walk, 'ground'),
  ])
  return [piece([a.x[0], a.x[1], a.road[0], a.road[1]], ROAD, color.paved, 'ground'), ...walks]
}

const streetPieces = (s: Street): readonly Piece[] => {
  const crossing = avenues.filter((a) => inZ(a, s) && inX(s, a))
  const road = gaps(s.z[0], s.z[1], crossing.map((a) => a.road)).map(([z0, z1]) =>
    piece([s.road[0], s.road[1], z0, z1], ROAD, s.surface === 'paved' ? color.paved : color.gravel, 'ground'),
  )
  const [h, c] = s.walks === 'boards' ? [BOARDS, color.boards] : [WALK, color.walk]
  const walks = gaps(s.z[0], s.z[1], crossing.map((a) => a.row)).flatMap(([z0, z1]): Piece[] => [
    piece([s.row[0], s.road[0], z0, z1], h, c, 'ground'),
    piece([s.road[1], s.row[1], z0, z1], h, c, 'ground'),
  ])
  return [...road, ...walks]
}

const LANE: Rect = [39, 44, 16, 48]
const ALLEY: Span = [78, 82]

const lanes: readonly Piece[] = [
  piece(LANE, ROAD, color.gravel, 'ground'),
  ...gaps(7, PLAY[1], streets.map((s) => s.row)).map(([x0, x1]) => piece([x0, x1, ALLEY[0], ALLEY[1]], ROAD, color.gravel, 'ground')),
]

// A building as the map gives it. `door` is the front door on the wall it opens through; `place` is the story place
// it holds, when it has one.
export type Building = Readonly<{
  id: string
  name: string
  rect: Rect
  h: number
  color: string
  door?: Vec
  place?: Place
}>

export const buildings: readonly Building[] = [
  { id: 'nc', name: 'Northern Commercial Co.', rect: [-74, -7, 16, 48], h: 9, color: color.brick, door: vec(-31, 16) },
  { id: 'federal', name: 'Federal Building and Post Office', rect: [-74, -7, 64, 96], h: 13, color: color.brick, door: vec(-7, 80) },
  { id: 'polaris', name: 'Polaris Building', rect: [88, 112, 16, 32], h: 35, color: color.slab, door: vec(88, 24) },
  { id: 'theater', name: 'Lacey Street Theater', rect: [56, 74, 26, 48], h: 9, color: color.brick, door: vec(66, 48) },
  { id: 'theaterTower', name: 'Lacey Street Theater tower', rect: [70, 74, 44, 48], h: 16, color: color.brick },
  { id: 'nordale', name: 'Nordale Hotel', rect: [18, 38, 64, 78], h: 11, color: color.brick, door: vec(28, 64) },
  { id: 'coop', name: 'Co-op Drug', rect: [39, 57, 64, 78], h: 8, color: color.brick, door: vec(48, 64) },
  { id: 'silverPan', name: 'The Silver Pan', rect: [23, 39, 32, 48], h: 6, color: color.named, door: vec(33, 48), place: 'silverPan' },
  { id: 'ptarmigan', name: 'The Ptarmigan', rect: [7, 21, 34, 48], h: 5.5, color: color.named, door: vec(14, 48) },
  { id: 'sluiceBox', name: 'The Sluice Box', rect: [44, 56, 34, 48], h: 5, color: color.named, door: vec(50, 48) },
  { id: 'blueSpruce', name: 'The Blue Spruce Lounge', rect: [88, 102, 34, 48], h: 7, color: color.named, door: vec(95, 48) },
  { id: 'nlCafe', name: 'Northern Lights Café', rect: [7, 17, 64, 78], h: 4.5, color: color.named, door: vec(12, 64) },
  { id: 'landOffice', name: 'The land office', rect: [100, 114, 64, 78], h: 7, color: color.named, door: vec(107, 64), place: 'landOffice' },
  { id: 'boardingHouse', name: "Owen's boarding house", rect: [126, 142, 82, 96], h: 7, color: color.named, door: vec(134, 96), place: 'owensRoom' },
  { id: 'floatShed', name: 'Quonset float shed', rect: [130, 150, 18, 28], h: 5, color: color.slab, door: vec(140, 18) },
]

// The blocks' unnamed frontage: one low mass per block, inset a little so a named building's wall on the block line
// never shares a plane with it.
export const blocks: readonly Readonly<{ id: string; rect: Rect }>[] = [
  { id: 'A1w', rect: [7, 39, 16, 48] },
  { id: 'A1e', rect: [44, 74, 16, 48] },
  { id: 'A2', rect: [88, 154, 16, 48] },
  { id: 'A3', rect: [168, 195, 16, 48] },
  { id: 'B1n', rect: [7, 74, 64, 78] },
  { id: 'B1s', rect: [7, 74, 82, 96] },
  { id: 'B2n', rect: [88, 154, 64, 78] },
  { id: 'B2s', rect: [88, 154, 82, 96] },
  { id: 'B3n', rect: [168, 195, 64, 78] },
  { id: 'B3s', rect: [168, 195, 82, 96] },
  { id: 'Cw', rect: [-40, -7, 110, 124] },
  { id: 'Ce', rect: [7, 40, 110, 124] },
  { id: 'Dw', rect: [-40, -7, 134, 140] },
  { id: 'De', rect: [7, 40, 134, 140] },
]

const INSET = 0.1
const BLOCK_H = 3.5

const inset = (r: Rect, k = INSET): Rect => [r[0] + k, r[1] - k, r[2] + k, r[3] - k]

// South of Third, only Cushman's lots are play space; the rest is town seen past the end of the street.
const backdrops: readonly Rect[] = [
  [PLAY[0], -40, 110, PLAY[3]],
  [40, PLAY[1], 110, PLAY[3]],
]

const DOOR_W = 1.2
const DOOR_H = 2.2

// A dark slab on the outside of the wall the door is in, so a door reads from the street.
const doorPiece = (b: Building): readonly Piece[] => {
  const d = b.door
  if (!d) return []
  const [x0, x1, z0, z1] = b.rect
  const out = 0.06
  const r: Rect =
    d.z === z0 || d.z === z1
      ? [d.x - DOOR_W / 2, d.x + DOOR_W / 2, d.z === z0 ? z0 - out : z1, d.z === z0 ? z0 : z1 + out]
      : [d.x === x0 ? x0 - out : x1, d.x === x0 ? x0 : x1 + out, d.z - DOOR_W / 2, d.z + DOOR_W / 2]
  return [{ box: box(r), h: DOOR_H, color: color.door }]
}

// The river and its edge. Water is drawn as one sheet and blocked as four, around the bridge deck and the float.
export const WATER_EDGE = -10
export const BRIDGE: Rect = [-6, 6, PLAY[2], 2]
export const FLOAT: Rect = [112, 126, -22, -10]
export const GANGWAY: Rect = [117, 120, -10, 0]

const river: readonly Piece[] = [
  piece([PLAY[0] - 40, PLAY[1] + 40, PLAY[2] - 60, WATER_EDGE], 0.02, color.water, 'ground'),
  piece([PLAY[0], PLAY[1], WATER_EDGE, 0], ROAD, color.bank, 'ground'),
  ...([
    [PLAY[0], BRIDGE[0], PLAY[2], WATER_EDGE],
    [BRIDGE[1], FLOAT[0], PLAY[2], WATER_EDGE],
    [FLOAT[0], FLOAT[1], PLAY[2], FLOAT[2]],
    [FLOAT[1], PLAY[1], PLAY[2], WATER_EDGE],
  ] as const).map((r) => piece(r, 0.01, color.water, 'blocker')),
  piece([BRIDGE[0], BRIDGE[1], BRIDGE[2], BRIDGE[3]], BOARDS, color.deck, 'ground'),
  piece([BRIDGE[0] - 0.4, BRIDGE[0], BRIDGE[2], 0], 1.0, color.rail, 'solid'),
  piece([BRIDGE[1], BRIDGE[1] + 0.4, BRIDGE[2], 0], 1.0, color.rail, 'solid'),
  piece(FLOAT, 0.12, color.boards, 'ground'),
  piece(GANGWAY, BOARDS, color.boards, 'ground'),
  ...[24, 31, 38, 52, 61].map((x) => piece([x, x + 1.4, -9.5, -5.5], 0.5, color.boards, 'solid')),
  { box: box([97, 110, -17.5, -15.5]), h: 1.4, y: 0.9, color: '#c9c4b5' },
  { box: box([101, 104, -22, -11]), h: 0.15, y: 2.4, color: '#c9c4b5' },
  { box: box([97, 110, -19.5, -18.9]), h: 0.5, y: 0.1, color: '#6a6f72' },
  { box: box([97, 110, -14.1, -13.5]), h: 0.5, y: 0.1, color: '#6a6f72' },
]

// Across the river and past the south edge: seen, never reached.
const beyond: readonly Piece[] = [
  { box: box([-40, -22, -88, -66]), h: 8, color: color.backdrop },
  { box: box([-33, -29, -88, -84]), h: 15, color: color.backdrop, shape: 'cone' },
  { box: box([-130, -80, -118, -82]), h: 14, color: color.backdrop },
  { box: box([88, 154, 112, 160]), h: 26, color: color.slab },
  { box: box([-67.25, -64.75, 20.75, 23.25]), h: 28, color: color.rail, shape: 'cylinder' },
  { box: box([-67.25, -64.75, 28.75, 31.25]), h: 28, color: color.rail, shape: 'cylinder' },
]

const POST_BOX = vec(-4.5, 66)

const furniture: readonly Piece[] = [piece([POST_BOX.x - 0.25, POST_BOX.x + 0.25, POST_BOX.z - 0.25, POST_BOX.z + 0.25], 1.2, '#2d4f86', 'solid')]

const edges: readonly Piece[] = [
  piece([PLAY[0] - 1, PLAY[1] + 1, PLAY[2] - 1, PLAY[2]], 0.01, '#000000', 'blocker'),
  piece([PLAY[0] - 1, PLAY[1] + 1, PLAY[3], PLAY[3] + 1], 0.01, '#000000', 'blocker'),
  piece([PLAY[0] - 1, PLAY[0], PLAY[2], PLAY[3]], 0.01, '#000000', 'blocker'),
  piece([PLAY[1], PLAY[1] + 1, PLAY[2], PLAY[3]], 0.01, '#000000', 'blocker'),
]

export const pieces: readonly Piece[] = [
  ...edges,
  ...river,
  ...avenues.flatMap(avenuePieces),
  ...streets.flatMap(streetPieces),
  ...lanes,
  ...blocks.map((b) => piece(inset(b.rect), BLOCK_H, color.block, 'solid')),
  ...backdrops.map((r) => piece(inset(r), BLOCK_H, color.backdrop, 'solid')),
  ...buildings.map((b) => piece(b.rect, b.h, b.color, 'solid')),
  ...buildings.flatMap(doorPiece),
  ...beyond,
  ...furniture,
]

// Spawn points, one per row of the town map's spawn table. Facing is a unit vector; (0, -1) faces north.
export type Spawn = Readonly<{ id: string; x: number; y: number; z: number; facing: Vec; inside?: string }>

export const spawns: readonly Spawn[] = [
  { id: 'silverPan', x: 33, y: 0.67, z: 46, facing: vec(0, -1), inside: 'silverPan' },
  { id: 'secondAve', x: 33, y: 0.4, z: 50.5, facing: vec(1, 0) },
  { id: 'boardingHouse', x: 134, y: 0.87, z: 98.5, facing: vec(0, -1) },
  { id: 'owensRoom', x: 134, y: 4.16, z: 86.2, facing: vec(0, -1), inside: 'boardingHouse' },
  { id: 'floatDock', x: 118.5, y: -0.3, z: 1, facing: vec(0, -1) },
  { id: 'floodedStreet', x: 135.4, y: 0.87, z: 97.5, facing: vec(0, -1) },
  { id: 'postBox', x: -6, y: 0.63, z: 66, facing: vec(1, 0) },
  { id: 'landOffice', x: 107, y: 0.57, z: 62, facing: vec(0, 1) },
  { id: 'nlCafe', x: 12, y: 0.57, z: 62, facing: vec(0, 1) },
  { id: 'bridgeSouth', x: 0, y: -0.18, z: -2, facing: vec(0, 1) },
]

export const spawnAt = (id: string): Spawn => {
  const s = spawns.find((p) => p.id === id)
  if (!s) throw new Error(`no downtown spawn ${id}`)
  return s
}

// The yaw a spawn's facing vector points along, in the convention of world.angleTo.
export const yawOf = (f: Vec): number => Math.atan2(f.x, f.z)

// Where an interior space sits on the map (the town map's "Interiors" table). Yaw is 0 or 180 degrees.
export type Placement = Readonly<{ space: string; at: Vec; yaw: 0 | 180 }>

export const placements: readonly Placement[] = [
  { space: 'bar', at: vec(33, 43), yaw: 0 },
  { space: 'room', at: vec(134, 85), yaw: 0 },
  { space: 'flood', at: vec(135.4, 103.9), yaw: 180 },
]

export const toWorld = (p: Placement, local: Vec): Vec =>
  p.yaw === 0 ? vec(p.at.x + local.x, p.at.z + local.z) : vec(p.at.x - local.x, p.at.z - local.z)

// The doors and the dock: what Owen can walk up to. A door opens when the story is at its place; the land office is
// locked through the prologue (its interior is a later pass), and says so.
export type Door = Readonly<{ id: string; place: Place; at: Vec; r: number; prompt: string; title: string; locked?: true }>

const outside = (b: Building, by = 0.6): Vec => {
  const d = b.door ?? vec(0, 0)
  const [x0, x1, z0, z1] = b.rect
  return d.z === z0 ? vec(d.x, z0 - by) : d.z === z1 ? vec(d.x, z1 + by) : d.x === x0 ? vec(x0 - by, d.z) : vec(x1 + by, d.z)
}

const building = (id: string): Building => {
  const b = buildings.find((x) => x.id === id)
  if (!b) throw new Error(`no building ${id}`)
  return b
}

export const doors: readonly Door[] = [
  { id: 'silverPan', place: 'silverPan', at: outside(building('silverPan')), r: 1.4, prompt: 'Go into the Silver Pan', title: 'The Silver Pan' },
  { id: 'boardingHouse', place: 'owensRoom', at: outside(building('boardingHouse')), r: 1.4, prompt: 'Go up to your room', title: "Owen's boarding house" },
  { id: 'landOffice', place: 'landOffice', at: outside(building('landOffice')), r: 1.4, prompt: 'Try the door', title: 'The land office', locked: true },
  { id: 'floatDock', place: 'floatDock', at: vec(118.5, -16), r: 2.5, prompt: 'Walk out to the plane', title: 'The float dock' },
]

export const doorSpots: readonly Interactable[] = doors.map((d) => ({ id: d.id, x: d.at.x, z: d.at.z, r: d.r, prompt: d.prompt }))

// The walks the prologue plays between its rooms, from the town map's route table. A leg starts when the story moves
// from one space to a place downtown reaches on foot; it ends at that place's door.
export type Leg = Readonly<{ from: string; place: Place; spawn: string; route: readonly (readonly [number, number])[] }>

export const legs: readonly Leg[] = [
  {
    from: 'bar',
    place: 'owensRoom',
    spawn: 'secondAve',
    route: [
      [81, 50.5],
      [81, 98],
      [134, 98],
      [134, 96.6],
    ],
  },
  {
    from: 'room',
    place: 'floatDock',
    spawn: 'boardingHouse',
    route: [
      [134, 98.8],
      [-5.5, 98.8],
      [-5.5, 66],
      [-5.5, 3],
      [118.5, 3],
      [118.5, -16],
    ],
  },
]

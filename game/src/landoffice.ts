import type { Figure, Prop, Space } from './levels.ts'
import type { Vec } from './world.ts'
import { distance, vec } from './world.ts'

// The land office on Second, the morning after the water peaked (place `landOffice`; docs/town-map.md, a 14 m lot,
// two floors, its door on Second at the north). Local x east, z south. The ground floor has 0.30 m of river in it
// (the town map's flood table); Lucy is hauling the wet ledgers up the staircase on the east wall to the dry floor
// above. Wade comes in the front door behind Eli.
//
// What the scene says comes from the story's menu. The ledgers in Wade's hands and the cigarette are the game's own:
// they send no note and change no state the story keeps.

const W = 12
const D = 10

// The ground floor's water line: thirty centimetres, flat across the room.
export const WATER = 0.3

export const SPAWN = vec(0, -4.1)
export const SPAWN_FACING = 0

// The staircase runs up the east wall from the room toward the back, STEPS treads of RISE each to the dry floor.
export const STAIR_X = 4.6
const STEPS = 10
const RISE = 0.3
const TREAD = 0.5
const STAIR_FOOT_Z = -1.6

export const LUCY_AT = vec(STAIR_X, -2.3)
export const PILE_AT = vec(-3.5, -1.6)

// How close Lucy has to be to take a lit cigarette out of Wade's mouth: as close as she is to talk to.
export const LUCY_REACH = 1.6

export const takesIt = (pos: Vec): boolean => distance(pos, LUCY_AT) <= LUCY_REACH

// What Wade can reach for, by what is in his hands: a ledger off the pile, or the one he carries handed up to Lucy.
// She talks to him with his hands empty.
export const officeSpot = (carrying: boolean, id: string): boolean => (id === 'handLedger') === carrying

const wall = (x: number, z: number, w: number, d: number, color: string): Prop => ({
  box: { x, z, w, d },
  h: 3.2,
  color,
  solid: true,
  occludes: true,
})

const plaster = '#a49c88'
const oak = '#5a4630'
const ledger = '#5b3a2a'
const DOOR = 1.2

const stair: readonly Prop[] = [
  ...Array.from({ length: STEPS }, (_, i): Prop => ({
    box: { x: STAIR_X, z: STAIR_FOOT_Z + TREAD * (i + 0.5), w: 1.2, d: TREAD },
    h: RISE * (i + 1),
    color: oak,
    solid: true,
  })),
  // The dry floor the stair comes up to, and its rail.
  { box: { x: STAIR_X - 0.4, z: STAIR_FOOT_Z + TREAD * STEPS + 0.7, w: 2.6, d: 1.4 }, h: 0.15, y: RISE * STEPS, color: '#6b5a42' },
  { box: { x: STAIR_X - 0.62, z: STAIR_FOOT_Z + (TREAD * STEPS) / 2, w: 0.06, d: TREAD * STEPS }, h: 0.06, y: RISE * STEPS * 0.55 + 0.9, color: '#3e2f20' },
  // Ledgers already carried up, stacked on the treads where she sets them down.
  { box: { x: STAIR_X + 0.3, z: STAIR_FOOT_Z + TREAD * 3.5, w: 0.4, d: 0.32 }, h: 0.14, y: RISE * 4, color: ledger },
  { box: { x: STAIR_X + 0.3, z: STAIR_FOOT_Z + TREAD * 6.5, w: 0.4, d: 0.32 }, h: 0.2, y: RISE * 7, color: ledger },
]

const pile: readonly Prop[] = [
  { box: { x: PILE_AT.x, z: PILE_AT.z, w: 1.0, d: 0.8 }, h: 0.5, color: '#4e3426', solid: true },
  { box: { x: PILE_AT.x + 0.1, z: PILE_AT.z - 0.05, w: 0.5, d: 0.36 }, h: 0.18, y: 0.5, color: ledger },
  { box: { x: PILE_AT.x - 0.2, z: PILE_AT.z + 0.15, w: 0.45, d: 0.34 }, h: 0.12, y: 0.68, color: '#6a4632' },
]

// The dressing, piece by piece, named the way #174 asks for the room: wet ledgers, a 1967 government office after the
// water. The public side in front of the counter took the river through the door: the sandbags that did not hold, the
// waiting bench and its chairs, papers floating. Behind the counter the clerks' side: desks, the plat table, the file
// cabinets and the safe, the wet records hung up to dry and the ledgers still on the upper shelves, above the water.
// Gray-box primitives only (docs/art/assets.md); nothing carries lettering. The big furniture is solid; everything
// stands off every way Wade walks, to the pile, to Lucy at the stair and out the door (landoffice.test.ts holds it to
// that).

const on = (x: number, z: number, w: number, d: number, y: number, h: number, color: string, shape?: 'cylinder'): Prop => ({
  box: { x, z, w, d },
  h,
  y,
  color,
  ...(shape ? { shape } : {}),
})
const can = (x: number, z: number, r: number, h: number, color: string, y = 0): Prop => on(x, z, r, r, y, h, color, 'cylinder')
const solid = (p: Prop): Prop => ({ ...p, solid: true })
const flat = (x: number, z: number, w: number, d: number, color: string, y = 0): Prop => ({ box: { x, z, w, d }, h: 0.01, y, color, flat: true })

const COUNTER_TOP = 1.05
const DESK_TOP = 0.76
// The inside faces of the walls.
const NORTH = -D / 2 + 0.16
const SOUTH = D / 2 - 0.16
const WEST = -W / 2 + 0.16
const EAST = W / 2 - 0.16

const paper = '#d9d2bc'
const wetPaper = '#b7ae94'
const steel = '#6e706a'
const olive = '#59604a'
const cardboard = '#8a7556'
const brass = '#9a8040'
const leather = ['#5b3a2a', '#4a3324', '#6a4632', '#3e3a2c', '#5a2e26']

// A chair: the seat and its back, the back toward `back` (+1 south, -1 north).
const chair = (x: number, z: number, back: 1 | -1, color = oak): readonly Prop[] => [
  on(x, z, 0.42, 0.42, 0, 0.45, color),
  on(x, z + back * 0.19, 0.42, 0.05, 0.45, 0.45, color),
]

// The shelves' east face: runs of ledgers on the three shelves above the water, gaps where Lucy has taken them down.
const SHELF_FACE = -5.35 + 0.1
const RUNS: readonly (readonly [number, number])[] = [[-0.9, 0.5], [-0.2, 0.4], [1.3, 0.6], [2.1, 0.3], [2.9, 0.5], [3.7, 0.5]]
const SHELF_ROWS = [1.0, 1.45, 1.9]

const CABINETS = [-4.8, -4.05, -3.3]

export const pieces: Readonly<Record<string, readonly Prop[]>> = {
  // The sandbags inside the door, either side, where the river came in over them anyway.
  sandbags: [-1.75, -1.3, 1.3, 1.75].flatMap((x) => [on(x, NORTH + 0.2, 0.42, 0.28, 0, 0.16, '#8a7b5a'), on(x + 0.15, NORTH + 0.2, 0.42, 0.28, 0.16, 0.15, '#857656')]),
  // The public side's waiting bench along the north wall, the ash stand by it, a chair knocked over and one floating.
  bench: [solid(on(-3.4, NORTH + 0.25, 1.8, 0.42, 0, 0.45, oak)), on(-3.4, NORTH + 0.05, 1.8, 0.05, 0.45, 0.5, oak)],
  ashStand: [can(-2.2, NORTH + 0.25, 0.28, 0.7, '#3a3a36'), can(-2.2, NORTH + 0.25, 0.3, 0.04, '#5a5a54', 0.7)],
  chairs: [
    on(-4.9, -4.0, 0.42, 0.45, 0, 0.42, oak),
    on(-4.9, -3.78, 0.45, 0.06, 0.1, 0.42, oak),
    on(-4.4, -2.6, 0.42, 0.42, WATER - 0.04, 0.06, '#5a4630'),
  ],
  coatTree: [can(WEST + 0.3, NORTH + 0.35, 0.06, 1.8, '#3e2f20'), can(WEST + 0.3, NORTH + 0.35, 0.4, 0.05, '#3e2f20'), on(WEST + 0.3, NORTH + 0.42, 0.4, 0.16, 1.05, 0.7, '#4a4f3a'), can(WEST + 0.3, NORTH + 0.35, 0.3, 0.12, '#3a3028', 1.8), can(WEST + 0.3, NORTH + 0.85, 0.25, 0.6, '#3e3a2c')],
  // The lobby's rug, rolled up soaked and shoved against the bench.
  rug: [on(-3.4, NORTH + 0.72, 1.6, 0.3, 0, 0.3, '#5a3a30')],
  // The map case by the west wall, its drawers of plats, and the rolled plats stood in a can on top.
  mapCase: [
    solid(on(WEST + 0.4, -2.85, 0.75, 1.1, 0, 0.9, olive)),
    ...[0.2, 0.45, 0.7].map((y) => on(WEST + 0.79, -2.85, 0.03, 1.0, y, 0.18, '#4d5340')),
    can(WEST + 0.4, -3.15, 0.28, 0.3, cardboard, 0.9),
    ...[-0.06, 0.06].map((dz) => can(WEST + 0.4 + dz, -3.15 + dz, 0.07, 0.75, paper, 0.9)),
    on(WEST + 0.4, -2.55, 0.6, 0.45, 0.9, 0.05, wetPaper),
  ],
  // The window wall: the radiator under the window, the bulletin board and its notices, the stopped clock over the door.
  radiator: [solid(on(3.4, NORTH + 0.12, 1.4, 0.2, 0, 0.7, '#7a7a72')), on(3.4, NORTH + 0.12, 1.45, 0.24, 0.7, 0.03, '#6a6a62')],
  bulletin: [
    on(1.75, NORTH + 0.01, 0.9, 0.03, 1.2, 0.7, '#8a6e4a'),
    ...[[1.5, 1.6], [1.8, 1.65], [2.05, 1.5], [1.65, 1.3]].map(([x, y]) => on(x, NORTH + 0.03, 0.2, 0.01, y, 0.26, paper)),
  ],
  clock: [on(0, NORTH + 0.03, 0.32, 0.04, 2.65, 0.32, '#e8e4d8'), on(0, NORTH + 0.06, 0.02, 0.01, 2.76, 0.13, '#1e1e1c')],
  plats: [on(-3.9, NORTH + 0.01, 1.1, 0.03, 1.35, 0.8, '#3e2f20'), on(-2.6, NORTH + 0.01, 0.8, 0.03, 1.45, 0.6, '#3e2f20'), on(-3.9, NORTH + 0.03, 1.0, 0.01, 1.4, 0.7, '#cfc4a2'), on(-2.6, NORTH + 0.03, 0.7, 0.01, 1.5, 0.5, '#cfc4a2')],
  // The northeast corner: the water cooler, the flags on their stands, the fire extinguisher on the east wall.
  cooler: [solid(on(EAST - 0.25, NORTH + 0.3, 0.4, 0.4, 0, 0.9, '#8a8a82')), can(EAST - 0.25, NORTH + 0.3, 0.3, 0.45, '#9db4bc', 0.9)],
  flags: [
    can(EAST - 0.35, -3.55, 0.05, 2.3, brass),
    can(EAST - 0.35, -3.55, 0.36, 0.08, '#3a3a36'),
    on(EAST - 0.35, -3.35, 0.03, 0.4, 1.5, 0.75, '#8a2a2a'),
    can(EAST - 0.35, -3.05, 0.05, 2.3, brass),
    can(EAST - 0.35, -3.05, 0.36, 0.08, '#3a3a36'),
    on(EAST - 0.35, -2.85, 0.03, 0.4, 1.5, 0.75, '#1f3a6a'),
  ],
  extinguisher: [can(EAST - 0.1, -4.05, 0.16, 0.5, '#8a2a24', 1.0)],
  // Lucy's mop and buckets at the end of the counter, the water she is losing to.
  mop: [can(1.85, -0.75, 0.32, 0.3, steel), can(1.85, -0.75, 0.04, 1.35, '#8a6a44'), can(2.0, -0.3, 0.3, 0.28, '#7a7c78')],
  // What floats on the river in the room: a ledger, the papers, a wastebasket on its side, a seat cushion.
  floating: [
    on(-4.6, -1.0, 0.36, 0.28, WATER - 0.02, 0.04, '#5b3a2a'),
    on(-2.9, -3.95, 0.34, 0.26, WATER - 0.02, 0.04, '#4a3324'),
    can(4.6, -4.0, 0.28, 0.3, steel, WATER - 0.12),
    on(-5.0, -2.1, 0.4, 0.4, WATER - 0.02, 0.06, '#6a3b33'),
    ...[[-1.0, -2.6], [0.8, -1.6], [-2.0, -1.0], [1.6, -3.5], [-0.4, -1.2], [2.3, -1.0], [-3.2, -2.6], [1.2, -2.4]].map(([x, z], i) =>
      flat(x, z, 0.22, 0.28, i % 2 ? paper : wetPaper, WATER + 0.005),
    ),
  ],
  // The high-water line on every wall, above the water standing in the room now.
  waterline: [
    flat(0, NORTH + 0.005, W - 0.3, 0.01, '#5a5444', 0.62),
    flat(0, SOUTH - 0.005, W - 0.3, 0.01, '#5a5444', 0.62),
    flat(EAST - 0.005, 0, 0.01, D - 0.3, '#5a5444', 0.62),
  ].map((p) => ({ ...p, h: 0.06 })),
  // The public counter: ledgers opened to dry, the wire trays, the stamp rack, the bell, a kerosene lamp, the power off.
  counter: [
    ...[-5.0, -4.3, -3.6, -2.9].map((x, i) => on(x, 0.6, 0.5, 0.36, COUNTER_TOP, 0.03 + (i % 2) * 0.02, i % 2 ? wetPaper : paper)),
    ...[-5.0, -4.3, -3.6, -2.9].map((x, i) => on(x, 0.6, 0.06, 0.38, COUNTER_TOP, 0.05, leather[i % leather.length])),
    on(-1.9, 0.55, 0.36, 0.28, COUNTER_TOP, 0.1, steel),
    on(-1.9, 0.55, 0.3, 0.22, COUNTER_TOP + 0.03, 0.06, paper),
    on(-1.3, 0.55, 0.36, 0.28, COUNTER_TOP, 0.12, steel),
    on(-0.6, 0.75, 0.26, 0.14, COUNTER_TOP, 0.18, '#3e2f20'),
    can(0.2, 0.5, 0.1, 0.06, brass, COUNTER_TOP),
    { ...can(1.1, 0.6, 0.16, 0.3, '#ffc27a', COUNTER_TOP), glow: true },
    on(0.5, 0.65, 0.42, 0.3, COUNTER_TOP, 0.2, cardboard),
  ],
  // The ledgers still on the upper shelves, above the water, and the empty lower shelves streaked with silt.
  shelfLedgers: SHELF_ROWS.flatMap((y, row) =>
    RUNS.filter((_, i) => (i + row) % 3 !== 0).map(([z, len], i) => on(SHELF_FACE, z, 0.2, len, y, 0.34, leather[(i + row) % leather.length])),
  ),
  silt: [flat(SHELF_FACE + 0.02, 1.5, 0.02, 5.2, '#6a5f48', 0.5)].map((p) => ({ ...p, h: 0.2 })),
  // The clerk's desk behind the counter: the chair, the typewriter, the telephone, the blotter, the trays.
  clerkDesk: [
    ...chair(-2.5, 3.5, 1),
    on(-2.5, 2.7, 0.45, 0.35, DESK_TOP, 0.18, '#3a3c38'),
    on(-3.0, 2.85, 0.22, 0.2, DESK_TOP, 0.1, '#1e1e1c'),
    on(-2.0, 2.65, 0.32, 0.26, DESK_TOP, 0.08, steel),
    on(-2.0, 3.0, 0.32, 0.26, DESK_TOP, 0.12, '#5b3a2a'),
    flat(-2.5, 3.0, 0.6, 0.4, '#3d4a3a', DESK_TOP + 0.005),
    can(-3.6, 3.3, 0.28, 0.32, steel),
  ],
  // The second desk, toward the counter gap, and its chair.
  secondDesk: [
    solid(on(-0.2, 2.0, 1.5, 0.75, 0, DESK_TOP, '#4e3826')),
    ...chair(-0.2, 2.75, 1),
    on(-0.6, 1.95, 0.34, 0.28, DESK_TOP, 0.14, '#4a3324'),
    on(-0.6, 1.95, 0.34, 0.28, DESK_TOP + 0.14, 0.1, '#5a2e26'),
    on(0.2, 1.9, 0.3, 0.24, DESK_TOP, 0.06, paper),
    on(0.3, 2.2, 0.18, 0.18, DESK_TOP, 0.3, '#3a3a36'),
    can(-0.2, 2.25, 0.16, 0.12, '#6e6a5e', DESK_TOP),
  ],
  // The plat table under the window light from the counter gap, a sheet spread on it, its stool.
  platTable: [
    solid(on(2.6, 2.4, 1.4, 1.0, 0, 0.95, '#6b5a42')),
    on(2.6, 2.4, 1.1, 0.8, 0.95, 0.01, '#cfc4a2'),
    on(2.3, 2.2, 0.5, 0.04, 0.96, 0.02, '#8a7e66'),
    can(2.6, 3.25, 0.36, 0.65, '#3e2f20'),
  ],
  // The file cabinets along the south wall, their bottom drawers pulled to drain, boxes of records on top.
  cabinets: [
    ...CABINETS.map((x) => solid(on(x, SOUTH - 0.33, 0.7, 0.65, 0, 1.32, steel))),
    ...CABINETS.map((x) => on(x, SOUTH - 0.85, 0.6, 0.4, 0.1, 0.28, '#5e605a')),
    ...CABINETS.map((x, i) => on(x, SOUTH - 0.33, 0.55, 0.42, 1.32, 0.28 + (i % 2) * 0.06, cardboard)),
  ],
  safe: [solid(on(-1.0, SOUTH - 0.38, 0.8, 0.7, 0, 1.1, '#3d4a3a')), can(-1.0, SOUTH - 0.74, 0.14, 0.03, brass, 0.6)],
  // The wet records strung up to dry on a line across the back of the room.
  dryingLine: [
    on(-1.9, 4.0, 5.6, 0.02, 2.05, 0.02, '#c8c0aa'),
    ...Array.from({ length: 12 }, (_, i) => on(-4.5 + i * 0.47, 4.0, 0.22, 0.01, 1.72 + (i % 3) * 0.04, 0.3 - (i % 3) * 0.04, i % 2 ? wetPaper : paper)),
  ],
  // The township plat and the office's photographs on the south wall, over the cabinets.
  southWall: [
    on(-4.05, SOUTH - 0.01, 2.2, 0.03, 1.9, 1.0, '#3e2f20'),
    on(-4.05, SOUTH - 0.03, 2.0, 0.01, 1.95, 0.9, '#cfc4a2'),
    ...[-2.0, -1.2, 0.4, 1.2].map((x) => on(x, SOUTH - 0.01, 0.4, 0.03, 1.7, 0.5, '#2e2a24')),
  ],
  // Boxes of records carried in from the vault, stacked off the floor on the clerk's side.
  boxes: [
    on(1.9, 4.3, 0.5, 0.4, 0, 0.3, '#5e4a36'),
    on(1.9, 4.3, 0.5, 0.4, 0.3, 0.3, cardboard),
    on(2.45, 4.35, 0.5, 0.4, 0, 0.3, cardboard),
    on(2.45, 4.35, 0.5, 0.4, 0.3, 0.3, '#5e4a36'),
    on(-1.4, 1.5, 0.5, 0.4, 0, 0.3, cardboard),
    on(-1.9, 1.5, 0.5, 0.4, 0, 0.3, '#5e4a36'),
    on(-1.9, 1.5, 0.5, 0.4, 0.3, 0.3, cardboard),
  ],
  // Ceiling: the dead light globes on their cords and the stopped fan over the public side.
  lights: [-3.0, 1.5].flatMap((x) => [-2.4, 2.6].flatMap((z) => [can(x, z, 0.03, 0.5, '#1e1e1c', 2.7), can(x, z, 0.32, 0.3, '#e0dccb', 2.4)])),
  fan: [on(-0.6, -2.0, 1.3, 0.14, 2.75, 0.02, '#5a4630'), on(-0.6, -2.0, 0.14, 1.3, 2.75, 0.02, '#5a4630'), can(-0.6, -2.0, 0.22, 0.2, '#3a3a36', 2.8)],
  // More ledgers she has carried up: on the treads and stacked on the dry floor at the top.
  carried: [
    on(STAIR_X - 0.25, STAIR_FOOT_Z + TREAD * 5.5, 0.4, 0.32, RISE * 6, 0.12, leather[1]),
    on(STAIR_X + 0.3, STAIR_FOOT_Z + TREAD * 8.5, 0.4, 0.32, RISE * 9, 0.18, leather[2]),
    ...[3.5, 4.0, 4.5, 5.0].map((x, i) => on(x, STAIR_FOOT_Z + TREAD * STEPS + 0.9, 0.4, 0.32, RISE * STEPS + 0.15, 0.2 + (i % 2) * 0.12, leather[i % leather.length])),
  ],
  // Her rubber boots, kicked off on the bottom tread she keeps dry.
  boots: [on(STAIR_X + 0.35, STAIR_FOOT_Z + TREAD * 1.5, 0.14, 0.3, RISE * 2, 0.32, '#1e1e1c'), on(STAIR_X + 0.15, STAIR_FOOT_Z + TREAD * 1.5, 0.14, 0.3, RISE * 2, 0.32, '#1e1e1c')],
}

const figures: readonly Figure[] = [
  { id: 'lucy', at: LUCY_AT, facing: -1.3, coat: '#6a3b33', skin: '#a8754f', hair: '#16130f', height: 1.62 },
  { id: 'eli', at: vec(-1.8, -3.6), facing: 1.37, coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 },
]

export const office: Space = {
  id: 'office',
  act: 'Act 1: Flood',
  place: 'landOffice',
  name: 'The land office',
  interior: true,
  size: { w: W, d: D },
  ground: '#4a4234',
  spawn: SPAWN,
  props: [
    wall(-(W / 2 + DOOR / 2) / 2, -D / 2, W / 2 - DOOR / 2, 0.3, plaster),
    wall((W / 2 + DOOR / 2) / 2, -D / 2, W / 2 - DOOR / 2, 0.3, plaster),
    wall(0, D / 2, W, 0.3, plaster),
    wall(-W / 2, 0, 0.3, D, plaster),
    wall(W / 2, 0, 0.3, D, plaster),
    // Second Avenue through the open door, so the room does not end in black.
    { box: { x: 0, z: -D / 2 - 0.6, w: DOOR + 0.6, d: 0.6 }, h: 0.02, color: '#6c665a', flat: true },
    // The public counter, the shelves the ledgers came off, a file cabinet, the clerk's desk behind the counter.
    { box: { x: -2.1, z: 0.6, w: 7.2, d: 0.7 }, h: 1.05, color: oak, solid: true, occludes: true },
    { box: { x: -5.6, z: 1.5, w: 0.5, d: 5.4 }, h: 2.4, color: '#4e3f2c', solid: true, occludes: true },
    { box: { x: 1.0, z: 3.9, w: 0.9, d: 0.7 }, h: 1.4, color: '#6e706a', solid: true },
    { box: { x: -2.5, z: 2.8, w: 1.6, d: 0.8 }, h: 0.76, color: '#4e3826', solid: true },
    ...stair,
    ...pile,
    // The river in the room, flat at the water line, and the window light off Second.
    { box: { x: 0, z: 0, w: W - 0.3, d: D - 0.3 }, h: 0.02, y: WATER - 0.02, color: '#4f5446', flat: true },
    { box: { x: 3.4, z: -D / 2 + 0.2, w: 1.6, d: 0.08 }, h: 1.2, y: 0.9, color: '#d8d4c4', glow: true },
    ...Object.values(pieces).flat(),
    // The cigarette Lucy dropped, floating where she let go of it.
    { box: { x: LUCY_AT.x - 0.5, z: LUCY_AT.z + 0.3, w: 0.08, d: 0.02 }, h: 0.02, y: WATER + 0.01, color: '#f2efe6', while: 'doused' },
  ],
  figures,
  spots: [
    { id: 'ledgers', x: PILE_AT.x, z: PILE_AT.z, r: 1.5, prompt: 'Pick up a wet ledger' },
    { id: 'lucy', x: LUCY_AT.x, z: LUCY_AT.z, r: LUCY_REACH, prompt: 'Talk to Lucy' },
    { id: 'handLedger', x: LUCY_AT.x, z: LUCY_AT.z, r: LUCY_REACH, prompt: 'Hand Lucy the ledger' },
  ],
}

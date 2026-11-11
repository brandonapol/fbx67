import type { Place } from '../../text-game/src/types.ts'
import type { Prop, Space } from './levels.ts'
import type { Box, Interactable, Vec } from './world.ts'
import { blocked, vec } from './world.ts'
import type { Rect } from './downtown.ts'
import { gaps } from './downtown.ts'

// Eielson Air Force Base, fall and winter 1967, as a gray box off docs/base-map.md: the gate, the gate road, Dorm
// Street and Flight Line Road; Wade's dormitory with his room, the squadron building with the duty desk and the
// Major's office, the photo lab with its records room, and the hangar, all walkable from one to the next with no cut;
// the dining hall, the pass office and the munitions igloos as closed masses. Every coordinate is a world coordinate
// off the base map: meters, x east, z south, origin at the gate shack. The ground is flat at y 0 and every building
// floor is a deck at y 0.3.
//
// Pass 1 draws the walkable buildings one storey high and roofless, so the camera can follow Wade inside; their full
// height, the snow and the plow berms are later passes. Nothing here reads the story: a scene's text and its gates stay
// in the text build, and the missions that play them on the base route here when they are built.

export const PLAY: Rect = [-20, 340, -140, 140]

export const CENTER = vec((PLAY[0] + PLAY[1]) / 2, (PLAY[2] + PLAY[3]) / 2)

export const SIZE = { w: PLAY[1] - PLAY[0], d: PLAY[3] - PLAY[2] } as const

export const FLOOR = 0.3

const WALL_H = 3
const WALL_T = 0.2
export const DOOR_W = 1.2
const DOOR_H = 2.1

const color = {
  ground: '#7d7a70',
  paved: '#4b4b4d',
  gravel: '#857d6d',
  walk: '#a19d94',
  lot: '#6c665a',
  apron: '#8e8c86',
  block: '#a6a397',
  dorm: '#9c9a8c',
  lab: '#8f9a96',
  steel: '#7f8a8e',
  floor: '#6e6b62',
  door: '#2c2622',
  fence: '#5f5d58',
  wood: '#5b3e28',
  locker: '#4f5a4a',
  bunk: '#5d6f7f',
  metal: '#5e6264',
  lamp: '#ffc27a',
  safelight: '#c4302b',
  igloo: '#b9b8ae',
  backdrop: '#77756f',
} as const

const box = (r: Rect): Box => ({ x: (r[0] + r[1]) / 2, z: (r[2] + r[3]) / 2, w: r[1] - r[0], d: r[3] - r[2] })

const solid = (r: Rect, h: number, c: string, y?: number): Prop => ({ box: box(r), h, color: c, solid: true, occludes: true, ...(y === undefined ? {} : { y }) })

const low = (r: Rect, h: number, c: string, y = FLOOR): Prop => ({ box: box(r), h, y, color: c, solid: true })

const flat = (r: Rect, h: number, c: string): Prop => ({ box: box(r), h, color: c, flat: true })

const glow = (r: Rect, h: number, y: number, c: string = color.lamp): Prop => ({ box: box(r), h, y, color: c, glow: true })

// The doors Wade walks through. Each is a 1.2 m gap in the wall it sits on, cut by the wall builders below, with a
// lintel over it and a dark threshold: `along` is the axis that wall runs on. A door is open in pass 1; who locks
// which door when is the missions' business.
export type Door = Readonly<{ id: string; at: Vec; along: 'x' | 'z' }>

export const doors: readonly Door[] = [
  { id: 'dormFront', at: vec(60, -30), along: 'x' },
  { id: 'dormSide', at: vec(90, -62), along: 'z' },
  { id: 'wadesRoom', at: vec(86, -54), along: 'x' },
  { id: 'squadronFront', at: vec(160, -40), along: 'x' },
  { id: 'squadronBack', at: vec(130, -58), along: 'z' },
  { id: 'dutyDesk', at: vec(160, -56), along: 'x' },
  { id: 'majorsOffice', at: vec(182, -60), along: 'x' },
  { id: 'labFront', at: vec(160, 30), along: 'x' },
  { id: 'labHall', at: vec(165, 40), along: 'x' },
  { id: 'darkroom', at: vec(160, 46), along: 'z' },
  { id: 'photoRecords', at: vec(170, 52), along: 'x' },
  { id: 'labBack', at: vec(190, 62), along: 'z' },
  { id: 'hangar', at: vec(262, -108), along: 'z' },
]

const span = (d: Door): readonly [number, number] => {
  const c = d.along === 'x' ? d.at.x : d.at.z
  return [c - DOOR_W / 2, c + DOOR_W / 2]
}

// A wall along x at z, from x0 to x1, with every door on that line cut out.
const wallX = (z: number, x0: number, x1: number, c: string): readonly Prop[] =>
  gaps(x0, x1, doors.filter((d) => d.along === 'x' && d.at.z === z).map(span)).map(([a, b]) =>
    solid([a, b, z - WALL_T / 2, z + WALL_T / 2], WALL_H, c),
  )

// A wall along z at x, from z0 to z1, with every door on that line cut out.
const wallZ = (x: number, z0: number, z1: number, c: string): readonly Prop[] =>
  gaps(z0, z1, doors.filter((d) => d.along === 'z' && d.at.x === x).map(span)).map(([a, b]) =>
    solid([x - WALL_T / 2, x + WALL_T / 2, a, b], WALL_H, c),
  )

const doorDressing = (d: Door): readonly Prop[] => {
  const [a, b] = span(d)
  const r: Rect = d.along === 'x' ? [a, b, d.at.z - WALL_T / 2, d.at.z + WALL_T / 2] : [d.at.x - WALL_T / 2, d.at.x + WALL_T / 2, a, b]
  return [
    { box: box(r), h: WALL_H - DOOR_H, y: DOOR_H, color: color.door },
    { box: box(r), h: 0.01, y: FLOOR, color: color.door, flat: true },
  ]
}

// A closed door drawn on the outside of a wall: a building the base map gives no interior.
const shut = (r: Rect): Prop => ({ box: box(r), h: DOOR_H, color: color.door })

// The four walls of a building's rectangle, and its floor.
const shell = (r: Rect, c: string): readonly Prop[] => [
  { box: box(r), h: FLOOR, color: color.floor, deck: true },
  ...wallX(r[2], r[0], r[1], c),
  ...wallX(r[3], r[0], r[1], c),
  ...wallZ(r[0], r[2], r[3], c),
  ...wallZ(r[1], r[2], r[3], c),
]

// Wade's dormitory, x 30..90, z -80..-30: the front door on the lot, a corridor north to the center hall, the hall
// east to the stair vestibule and the side door, and Wade's room at the east end with its window on the east wall.
// The other rooms are closed.
export const DORM: Rect = [30, 90, -80, -30]
export const WADES_ROOM: Rect = [82, 90, -54, -46]

const dorm: readonly Prop[] = [
  ...shell(DORM, color.dorm),
  ...wallZ(58, -54, -30, color.dorm),
  ...wallZ(62, -54, -30, color.dorm),
  ...wallX(-54, 30, 58, color.dorm),
  ...wallX(-54, 62, 90, color.dorm),
  ...wallX(-58, 30, 84, color.dorm),
  ...wallZ(84, -64, -58, color.dorm),
  ...wallX(-64, 84, 90, color.dorm),
  ...wallZ(82, -54, -46, color.dorm),
  ...wallX(-46, 82, 90, color.dorm),
  // Wade's room: two bunks on the west wall, the lockers, the desk under the window, the footlocker at the foot of
  // his bunk, the window itself.
  low([82.2, 83.2, -53.4, -51.4], 0.6, color.bunk),
  low([82.2, 83.2, -48.6, -46.6], 0.6, color.bunk),
  low([84.2, 85.8, -46.7, -46.2], 1.9, color.locker),
  low([86.2, 87.8, -46.7, -46.2], 1.9, color.locker),
  low([88.7, 89.7, -50.7, -49.3], 0.76, color.wood),
  low([83.4, 84.2, -48.3, -47.7], 0.45, color.wood),
  glow([89.82, 89.9, -50.6, -49.4], 1.0, FLOOR + 1.0, '#cfd9e0'),
  glow([85.9, 86.1, -50.1, -49.9], 0.1, FLOOR + 2.6),
]

// The dorm lot and its plug-in posts along z -27, one per stall.
const dormLot: readonly Prop[] = [
  flat([30, 90, -28, -8], 0.02, color.lot),
  ...Array.from({ length: 20 }, (_, i) => low([31.5 + 3 * i - 0.08, 31.5 + 3 * i + 0.08, -27.08, -26.92], 1.1, color.metal, 0)),
]

// The squadron building, x 130..190, z -80..-40: the entry with the duty desk, the hall the length of the building
// behind it, the Major's office at the hall's east end, the back door at its west end. The offices are closed.
export const SQUADRON: Rect = [130, 190, -80, -40]
export const MAJORS_OFFICE: Rect = [174, 190, -80, -60]

const squadron: readonly Prop[] = [
  ...shell(SQUADRON, color.block),
  ...wallZ(150, -56, -40, color.block),
  ...wallZ(170, -56, -40, color.block),
  ...wallX(-56, 130, 190, color.block),
  ...wallX(-60, 130, 190, color.block),
  ...wallZ(153, -80, -60, color.block),
  ...wallZ(174, -80, -60, color.block),
  // The duty desk's window onto the hall, the counter, the desk, its lamp and the phone.
  glow([152, 158, -56.12, -55.88], 1.0, FLOOR + 1.0, '#e8dcc0'),
  low([151, 155, -52, -44], 1.05, color.wood),
  low([163, 167, -50, -46], 0.76, color.wood),
  glow([165.8, 166.2, -48.6, -48.2], 0.35, FLOOR + 0.76),
  low([164, 164.3, -49, -48.6], 0.12, '#1e1e1e', FLOOR + 0.76),
  // The closed office doors along the hall.
  shut([140, 141, -55.8, -55.7]),
  shut([163, 164, -60.3, -60.2]),
  shut([142, 143, -60.3, -60.2]),
  // The Major's office: the desk facing the door, the cabinet against the north wall, the window over it.
  low([180.8, 183.2, -70.5, -69.5], 0.76, color.wood),
  low([185.6, 186.4, -78.3, -77.7], 1.35, color.metal),
  glow([180, 184, -79.9, -79.82], 1.0, FLOOR + 1.0, '#cfd9e0'),
]

// The squadron lot, its posts along z -37, and the Major's staff car in the stall nearest the door.
const squadronLot: readonly Prop[] = [
  flat([130, 190, -38, -8], 0.02, color.lot),
  ...Array.from({ length: 20 }, (_, i) => low([131.5 + 3 * i - 0.08, 131.5 + 3 * i + 0.08, -37.08, -36.92], 1.1, color.metal, 0)),
  low([185, 187, -32.3, -27.7], 1.4, '#2f3a48', 0),
]

// The photo lab, x 130..190, z 30..70: the counter inside the front door, the darkrooms west, the lab hall east, the
// records room behind it with the back door onto the service lane.
export const LAB: Rect = [130, 190, 30, 70]
export const RECORDS: Rect = [160, 190, 52, 70]

const lab: readonly Prop[] = [
  ...shell(LAB, color.lab),
  ...wallZ(150, 30, 40, color.lab),
  ...wallZ(170, 30, 40, color.lab),
  ...wallX(40, 130, 190, color.lab),
  ...wallZ(160, 40, 70, color.lab),
  ...wallX(52, 160, 190, color.lab),
  // The counter, open at its east end, and the sign-in book on it.
  low([150.2, 163, 37.4, 38.2], 1.05, color.wood),
  low([157, 157.6, 37.5, 37.9], 0.04, '#efe6cf', FLOOR + 1.05),
  // The darkrooms: the sinks and trays under the red safelights.
  ...[48, 56, 64].flatMap((z): Prop[] => [low([131, 139, z - 0.5, z + 0.5], 0.9, color.metal), glow([134.8, 135.2, z - 0.2, z + 0.2], 0.1, FLOOR + 2.6, color.safelight)]),
  // The records room: three rows of flat drawers, as tall as a man, so the aisles behind them are out of sight of
  // the door; the index card cabinet by the door, one bulb.
  ...[58, 62, 66].map((z): Prop => ({ ...low([164, 186, z - 0.5, z + 0.5], 2.2, color.metal), occludes: true })),
  low([172, 173, 52.7, 53.3], 1.3, color.wood),
  glow([174.9, 175.1, 60.9, 61.1], 0.1, FLOOR + 2.6),
]

// The mess pulling everything leaves (photoLab.ts): the index card's three drawers hanging open out of the first row,
// and prints on the floor in front of them. Drawn only once Wade has started pulling.
const print = (x: number, z: number): Prop => ({ box: box([x - 0.12, x + 0.12, z - 0.1, z + 0.1]), h: 0.01, y: FLOOR, color: '#e9e4d6', flat: true, while: 'mess' })

export const MESS: readonly Prop[] = [
  ...[[166.6, 1.0], [168, 1.4], [169.4, 0.6]].map(([x, y]): Prop => ({ box: box([x! - 0.6, x! + 0.6, 56.95, 57.5]), h: 0.14, y: FLOOR + y!, color: color.metal, while: 'mess' })),
  ...[[166.2, 56.4], [167.1, 55.9], [168.4, 56.2], [169.1, 55.4], [167.7, 54.9], [170.3, 56.1], [165.6, 55.3]].map(([x, z]) => print(x!, z!)),
]

// The hangar, x 262..302, z -130..-100: the big doors shut on the south face, the personnel door on the west; the
// light plane up on jacks with its cowling off, the workbench and the parts racks on the west wall, the heater.
export const HANGAR: Rect = [262, 302, -130, -100]

const hangar: readonly Prop[] = [
  ...shell(HANGAR, color.steel),
  solid([266, 298, -99.9, -99.6], 6, color.steel),
  low([279, 281, -122, -112], 1.2, '#c9c4b5', 1.0),
  low([272, 288, -118.5, -116.5], 0.15, '#c9c4b5', 2.0),
  ...[[279.5, -121], [280.5, -121], [279.5, -113], [280.5, -113]].map(([x, z]) => low([x! - 0.1, x! + 0.1, z! - 0.1, z! + 0.1], 0.7, color.metal)),
  low([262.4, 263.4, -128, -116], 0.9, color.wood),
  low([262.4, 263.4, -104, -101], 2.0, color.metal),
  low([266.6, 267.4, -112.4, -111.6], 0.9, '#7a2a1c'),
  glow([266.8, 267.2, -112.2, -111.8], 0.1, FLOOR + 0.9, '#ff8a4a'),
]

// The gate: the shack on its island in the gate road, the floodlight, and the fence at x 6 from edge to edge but for
// the gate road; the pass office outside it.
const gate: readonly Prop[] = [
  low([-3, 3, -1.5, 1.5], 0.15, color.walk, 0),
  solid([-1.5, 1.5, -1.2, 1.2], 3.5, color.block),
  glow([-0.3, 0.3, -0.3, 0.3], 0.3, 3.6),
  ...[[PLAY[2], -7], [7, PLAY[3]]].map(([z0, z1]) => low([5.95, 6.05, z0!, z1!], 2.4, color.fence, 0)),
  solid([-18, -6, 12, 22], 4, color.block),
  shut([-12.6, -11.4, 11.9, 12]),
]

// The dining hall, closed; the munitions storage area, seen through its fence and its shut gate.
const closed: readonly Prop[] = [
  solid([30, 90, 30, 60], 5, color.block),
  shut([59.4, 60.6, 29.9, 30]),
  low([289.95, 290.05, 60, PLAY[3]], 2.4, color.fence, 0),
  low([290, PLAY[1], 59.95, 60.05], 2.4, color.fence, 0),
  ...[76, 100, 124].flatMap((z) => [306, 324].map((x) => solid([x, x + 12, z, z + 12], 4, color.igloo))),
]

// Gate road, Dorm Street, Flight Line Road, the munitions road and the service lane, at heights that never tie.
const ROAD = 0.03
const WALK = 0.06

const ground: readonly Prop[] = [
  flat([PLAY[0], 250, -5, 5], ROAD, color.paved),
  ...gaps(6, 240, [[104, 114]]).flatMap(([a, b]) => [flat([a, b, -7, -5], WALK, color.walk), flat([a, b, 5, 7], WALK, color.walk)]),
  ...[[104, 114], [240, 250]].flatMap(([x0, x1]) => [flat([x0!, x1!, PLAY[2], -5], ROAD, color.paved), flat([x0!, x1!, 5, PLAY[3]], ROAD, color.paved)]),
  flat([250, 290, 96, 104], ROAD, color.gravel),
  flat([190, 196, 8, 70], ROAD, color.gravel),
  flat([250, PLAY[1], PLAY[2], -90], 0.02, color.apron),
  // The Richardson Highway past the west edge, and the base past the north and south edges: seen, never reached.
  flat([-40, -24, PLAY[2] - 60, PLAY[3] + 60], ROAD, color.paved),
  solid([30, 90, -130, -100], 10.5, color.backdrop),
  solid([30, 90, 90, 120], 10.5, color.backdrop),
]

const edges: readonly Prop[] = [
  low([PLAY[0] - 1, PLAY[1] + 1, PLAY[2] - 1, PLAY[2]], 0.01, '#000000', 0),
  low([PLAY[0] - 1, PLAY[1] + 1, PLAY[3], PLAY[3] + 1], 0.01, '#000000', 0),
  low([PLAY[0] - 1, PLAY[0], PLAY[2], PLAY[3]], 0.01, '#000000', 0),
  low([PLAY[1], PLAY[1] + 1, PLAY[2], PLAY[3]], 0.01, '#000000', 0),
]

export const pieces: readonly Prop[] = [
  ...edges,
  ...ground,
  ...dormLot,
  ...squadronLot,
  ...gate,
  ...closed,
  ...dorm,
  ...squadron,
  ...lab,
  ...MESS,
  ...hangar,
  ...doors.flatMap(doorDressing),
]

// Spawn points, one per row of the base map's spawn table. Facing is a unit vector; (0, -1) faces north.
export type Spawn = Readonly<{ id: Place | 'eielsonGate' | 'barracksWindow' | 'munitionsFence'; x: number; y: number; z: number; facing: Vec }>

export const spawns: readonly Spawn[] = [
  { id: 'eielsonGate', x: 8, y: 0, z: 3, facing: vec(1, 0) },
  { id: 'eielsonBarracks', x: 86, y: 0.3, z: -50, facing: vec(1, 0) },
  { id: 'barracksWindow', x: 92, y: 0, z: -50, facing: vec(-1, 0) },
  { id: 'squadronBuilding', x: 160, y: 0, z: -36, facing: vec(0, -1) },
  { id: 'majorsOffice', x: 182, y: 0.3, z: -62, facing: vec(0, -1) },
  { id: 'photoLab', x: 160, y: 0.3, z: 36, facing: vec(0, 1) },
  { id: 'photoRecords', x: 170, y: 0.3, z: 54, facing: vec(0, 1) },
  { id: 'baseHangar', x: 258, y: 0, z: -108, facing: vec(1, 0) },
  { id: 'munitionsFence', x: 284, y: 0, z: 100, facing: vec(1, 0) },
]

export const spawnAt = (id: string): Spawn => {
  const s = spawns.find((p) => p.id === id)
  if (!s) throw new Error(`no base spawn ${id}`)
  return s
}

const barracks = spawnAt('eielsonBarracks')

// The way back to the records room from the photo lab's front door: the open east end of the counter, which the lab
// hall door is past. The photo lab's menu (when Wade goes in, or whether) comes up here (photoLab.ts).
export const LAB_SPOT: Interactable = { id: 'recordsWay', x: 163.5, z: 38, r: 3, prompt: 'Look past the counter to the records room' }

// The index card's three drawers, on the north face of the first row in from the door (photoLab.ts).
export const DRAWERS: Interactable = { id: 'drawers', x: 168, z: 57.3, r: 1.5, prompt: 'Open the drawers on the index card' }

export const eielson: Space = {
  id: 'eielson',
  act: 'Act 2: Freeze-up',
  name: 'Eielson Air Force Base',
  places: ['photoLab', 'photoRecords'],
  interior: false,
  size: SIZE,
  center: CENTER,
  ground: color.ground,
  spawn: vec(barracks.x, barracks.z),
  props: pieces,
  figures: [],
  spots: [LAB_SPOT, DRAWERS],
}

// The nav graph: the base's walkable network as nodes on the base map's routes, through the doors, and the straight
// edges between them, every one clear of the collision. Every spawn is a node; a mission walks Wade, and a patrol
// walks its man, along it.
export type Nav = Readonly<{ nodes: Readonly<Record<string, Vec>>; edges: readonly (readonly [string, string])[] }>

const spawnNodes = Object.fromEntries(spawns.map((s) => [s.id, vec(s.x, s.z)]))

export const nav: Nav = {
  nodes: {
    ...spawnNodes,
    gateSouthWalk: vec(40, 6),
    dormLotFoot: vec(60, -7),
    dormFrontOut: vec(60, -29),
    dormEntry: vec(60, -32),
    dormHall: vec(60, -56),
    dormHallEast: vec(86, -56),
    dormVestibule: vec(87, -62),
    dormSideOut: vec(91.5, -62),
    dormStreet: vec(109, -62),
    dormStreetFoot: vec(109, -7),
    squadronBackOut: vec(129, -58),
    squadronHallWest: vec(133, -58),
    squadronHall: vec(160, -58),
    squadronHallEast: vec(182, -58),
    squadronEntry: vec(160, -42),
    squadronLotFoot: vec(160, -7),
    labWalk: vec(160, 8),
    labFrontOut: vec(160, 28.5),
    labCounterEast: vec(165, 36),
    labHall: vec(165, 43),
    recordsDoor: vec(170, 50),
    recordsAisle: vec(188, 55),
    recordsBack: vec(188, 62),
    laneBack: vec(193, 62),
    laneMouth: vec(193, 6),
    flightLine: vec(245, 0),
    flightLineHangar: vec(245, -108),
    hangarFloor: vec(266, -108),
    flightLineMunitions: vec(245, 100),
  },
  edges: [
    ['eielsonGate', 'gateSouthWalk'],
    ['gateSouthWalk', 'dormLotFoot'],
    ['dormLotFoot', 'dormFrontOut'],
    ['dormFrontOut', 'dormEntry'],
    ['dormEntry', 'dormHall'],
    ['dormHall', 'dormHallEast'],
    ['dormHallEast', 'eielsonBarracks'],
    ['dormHallEast', 'dormVestibule'],
    ['dormVestibule', 'dormSideOut'],
    ['dormSideOut', 'barracksWindow'],
    ['dormSideOut', 'dormStreet'],
    ['dormStreet', 'dormStreetFoot'],
    ['dormStreet', 'squadronBackOut'],
    ['squadronBackOut', 'squadronHallWest'],
    ['squadronHallWest', 'squadronHall'],
    ['squadronHall', 'squadronHallEast'],
    ['squadronHallEast', 'majorsOffice'],
    ['squadronHall', 'squadronEntry'],
    ['squadronEntry', 'squadronBuilding'],
    ['squadronBuilding', 'squadronLotFoot'],
    ['dormLotFoot', 'dormStreetFoot'],
    ['dormStreetFoot', 'squadronLotFoot'],
    ['squadronLotFoot', 'labWalk'],
    ['labWalk', 'labFrontOut'],
    ['labFrontOut', 'photoLab'],
    ['photoLab', 'labCounterEast'],
    ['labCounterEast', 'labHall'],
    ['labHall', 'recordsDoor'],
    ['recordsDoor', 'photoRecords'],
    ['photoRecords', 'recordsAisle'],
    ['recordsAisle', 'recordsBack'],
    ['recordsBack', 'laneBack'],
    ['laneBack', 'laneMouth'],
    ['labWalk', 'laneMouth'],
    ['laneMouth', 'flightLine'],
    ['flightLine', 'flightLineHangar'],
    ['flightLineHangar', 'baseHangar'],
    ['baseHangar', 'hangarFloor'],
    ['flightLine', 'flightLineMunitions'],
    ['flightLineMunitions', 'munitionsFence'],
  ],
}

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.z - b.z)

// The shortest way along the nav graph from one node to another, as the nodes' points, both ends included.
export const navRoute = (from: string, to: string, g: Nav = nav): readonly Vec[] => {
  const at = (id: string): Vec => {
    const p = g.nodes[id]
    if (!p) throw new Error(`no nav node ${id}`)
    return p
  }
  const near = (id: string): readonly string[] => g.edges.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []))
  type Best = Readonly<Record<string, Readonly<{ d: number; via?: string }>>>
  // Dijkstra over the graph's few dozen nodes: settle the nearest open node, relax its edges, repeat.
  const settle = (best: Best, open: readonly string[]): Best => {
    if (open.length === 0) return best
    const here = open.reduce((m, id) => (best[id]!.d < best[m]!.d ? id : m))
    const d = best[here]!.d
    const better = near(here).filter((n) => d + dist(at(here), at(n)) < (best[n]?.d ?? Infinity))
    const next = better.reduce<Best>((acc, n) => ({ ...acc, [n]: { d: d + dist(at(here), at(n)), via: here } }), best)
    return settle(next, [...open.filter((id) => id !== here && !better.includes(id)), ...better])
  }
  at(from)
  at(to)
  const best = settle({ [from]: { d: 0 } }, [from])
  if (!best[to]) throw new Error(`no way from ${from} to ${to}`)
  const back = (id: string): readonly string[] => (id === from ? [id] : [...back(best[id]!.via!), id])
  return back(to).map(at)
}

// Whether a straight walk from a to b stays clear of the boxes, sampled every 10 cm.
export const clear = (a: Vec, b: Vec, boxes: readonly Box[]): boolean => {
  const n = Math.max(1, Math.ceil(dist(a, b) / 0.1))
  return Array.from({ length: n + 1 }, (_, i) => vec(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n)).every((p) => !blocked(p, boxes))
}

// The patrol lines of the base map, as data: who, the path walked in order, the speed in m/s, and when. A `loop`
// path runs back to its start; otherwise the man walks it out and back. Corners the base map leaves implicit (the
// turn through a door, the step off the walk) are written in, so every leg stays clear of the collision.
export type Shift =
  | Readonly<{ kind: 'dark' }>
  | Readonly<{ kind: 'every'; minutes: number }>
  | Readonly<{ kind: 'between'; from: string; to: string }>
  | Readonly<{ kind: 'once'; at: string }>
  | Readonly<{ kind: 'always' }>

export type Patrol = Readonly<{ id: string; who: string; path: readonly Vec[]; loop: boolean; speed: number; shift: Shift}>

const pts = (ps: readonly (readonly [number, number])[]): readonly Vec[] => ps.map(([x, z]) => vec(x, z))

export const patrols: readonly Patrol[] = [
  {
    id: 'P1',
    who: 'Air Police pickup truck',
    path: pts([[10, 4], [109, 4], [109, -130], [109, 4], [245, 4], [245, 104], [245, -130], [245, -4], [10, -4]]),
    loop: true,
    speed: 4,
    shift: { kind: 'dark' },
  },
  {
    id: 'P2',
    who: 'The duty runner',
    path: pts([[160, -48], [160, -58], [134, -58], [186, -58], [160, -58]]),
    loop: true,
    speed: 1.2,
    shift: { kind: 'every', minutes: 20 },
  },
  {
    id: 'P3',
    who: 'The photo lab clerk',
    path: pts([[160, 35], [160, 8], [160, 6], [60, 6], [60, 29]]),
    loop: false,
    speed: 1.3,
    shift: { kind: 'between', from: '12:00', to: '12:45' },
  },
  {
    id: 'P4',
    who: 'The duty sergeant at lockup',
    path: pts([[160, 29], [193, 29], [193, 62], [188, 62], [193, 62], [193, 6], [100, 6]]),
    loop: false,
    speed: 1.3,
    shift: { kind: 'once', at: '17:00' },
  },
  { id: 'P5', who: 'The gate', path: pts([[-10, 9], [4, 9]]), loop: false, speed: 1.0, shift: { kind: 'always' } },
  { id: 'P6', who: 'Munitions area truck', path: pts([[296, 136], [296, 66], [338, 66]]), loop: false, speed: 3, shift: { kind: 'dark' } },
]

// The legs a patrol walks, in order: out and back for an open path, round to the start for a loop.
export const legsOf = (p: Patrol): readonly (readonly [Vec, Vec])[] => {
  const out = p.path.slice(1).map((b, i) => [p.path[i]!, b] as const)
  return p.loop ? [...out, [p.path.at(-1)!, p.path[0]!] as const] : [...out, ...out.map(([a, b]) => [b, a] as const).reverse()]
}

// Where a patrol is t seconds into its round.
export const patrolAt = (p: Patrol, t: number): Vec => {
  const legs = legsOf(p)
  const total = legs.reduce((s, [a, b]) => s + dist(a, b), 0)
  const along = (((t * p.speed) % total) + total) % total
  const walk = (i: number, left: number): Vec => {
    const [a, b] = legs[i]!
    const l = dist(a, b)
    if (left <= l || i === legs.length - 1) return l < 1e-9 ? a : vec(a.x + ((b.x - a.x) * left) / l, a.z + ((b.z - a.z) * left) / l)
    return walk(i + 1, left - l)
  }
  return walk(0, along)
}

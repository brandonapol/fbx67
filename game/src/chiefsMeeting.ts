import type { State } from '../../text-game/src/types.ts'
import { menu } from '../../text-game/src/story.ts'
import type { Activity } from './cast.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Interactable, Vec } from './world.ts'
import { vec } from './world.ts'

// The Tanana Chiefs meeting (place `communityHall`, scenes a2_chiefs, a2_chiefs_spoke, a2_chiefs_after; #130, #203,
// #204): a community hall on the edge of town, as a gray box. Local x east, z south: the door in the south wall at the
// back, the map of the Interior on the north wall at the front, rows of folding chairs between, the coffee urn on its
// table east of the chairs (URN_AT in soundscape.ts, where the hall's percolator plays).
//
// DRAFT, FOR CONSULTANT REVIEW (docs/consultant-review.md, items 10 and 11). Everything in this room is staged from the
// scene's own text and nothing else: the folding chairs, the coffee urn, the map with colored pins, delegates from up
// and down the Tanana and the Yukon, the old man from Nenana speaking, Eli standing to speak for his family, the woman
// writing it all down, Ashby in the back row handing out cards, Lucy and Wade standing at the back. No speech, custom,
// dress or protocol is added here; the delegates are unnamed and wear plain period clothes in gray-box colors, and what
// each is doing is ordinary meeting business (listening, a cup of coffee). Any of it changes if the consultants ask.
//
// Wade's three choices are where he stands and when he moves: staying at the back wall through the speeches (held, so
// he stays), walking up the aisle to the front to stand up and talk, or going out the door. Each is the scene's own
// note, labeled by the story's menu; nothing here decides what a note does.

const W = 14
const D = 11
const DOOR = 1.2
const DOOR_X = -5.5

export const SPAWN = vec(DOOR_X, D / 2 - 0.9)
// Facing north, into the room.
export const SPAWN_FACING = Math.PI

// Where Wade stands at the back wall, by Lucy; the aisle's front, where a speaker stands to address the room; the door.
export const BACK_AT = vec(-2.2, 4.5)
export const FLOOR_AT = vec(-1.5, -3.0)
export const DOOR_AT = vec(DOOR_X, D / 2 - 0.4)
export const URN = vec(3.2, -2.6)

// How long Wade stands and listens before the meeting moves on without him: the speeches, held.
export const LISTEN_TIME = 6

// The spots of the meeting itself, each the scene's note: the label is the story's (prologue.ts label()).
export const BACK_SPOT: Interactable = { id: 'back', x: BACK_AT.x, z: BACK_AT.z, r: 1.2, note: 'listen', hold: LISTEN_TIME }
export const FLOOR_SPOT: Interactable = { id: 'floor', x: FLOOR_AT.x, z: FLOOR_AT.z, r: 1.0, note: 'offerHelp' }
export const DOOR_SPOT: Interactable = { id: 'door', x: DOOR_AT.x, z: DOOR_AT.z, r: 1.0, note: 'slipOut' }
// After the meeting (a2_chiefs_spoke, a2_chiefs_after) the one way on is out the door with Lucy.
export const OUT_SPOT: Interactable = { id: 'out', x: DOOR_AT.x, z: DOOR_AT.z, r: 1.0, prompt: 'Go out with Lucy' }

const meetingSpots: readonly string[] = [BACK_SPOT.id, FLOOR_SPOT.id, DOOR_SPOT.id]

// The meeting is going on while the story's menu offers staying at the back: the hall's other scenes only go on.
export const meeting = (s: State): boolean => menu(s).options.some((o) => o.note === BACK_SPOT.note)

// Which spots are there to use: the three ways through the meeting while it goes on, the door out after it.
export const hallSpot = (s: State, id: string): boolean => (meeting(s) ? meetingSpots.includes(id) : id === OUT_SPOT.id)

// The note a spot without its own sends: going out after the meeting is the scene's `continue`.
export const hallNote = (s: State, id: string): string | undefined => (!meeting(s) && id === OUT_SPOT.id ? 'continue' : undefined)

// The button that puts the scene's text away and leaves Wade in the room.
export const hallClose = (s: State): string => (meeting(s) ? 'Stand at the back wall.' : 'Step back.')

// Where Wade is when a hall scene opens: in at the door for the meeting, or coming into the hall after it; after he
// stood up at the front, at the door, since Lucy says her piece outside; otherwise where he already stands.
export const standFor = (s: State, here: Vec | undefined, sent?: string): Vec =>
  meeting(s) || !here ? SPAWN : sent === FLOOR_SPOT.note ? DOOR_AT : here

// The people in the room. Each has a look of their own and something they are doing; the delegates are not one figure
// copied (chiefsMeeting.test.ts holds every look and place distinct).
export type Doing = 'speaking' | 'standing to speak' | 'writing it down' | 'listening' | 'coffee' | 'handing out cards' | 'watching'

export type Person = Readonly<{
  id: string
  // Who they are, in the scene's words; the delegates are unnamed.
  role: string
  doing: Doing
  activity: Activity
  at: Vec
  facing: number
  coat: string
  skin: string
  hair: string
  height: number
  // Only while the meeting goes on: Ashby has gone out the door by the time it is over (a2_chiefs_after).
  meetingOnly?: true
}>

const NORTH = Math.PI
const SOUTH = 0

// The chairs: two blocks either side of the center aisle (x -2.49 to -0.51), five rows facing the front.
const WEST_XS = [-5.5, -4.8, -4.1, -3.4, -2.7]
const EAST_XS = [-0.3, 0.4, 1.1, 1.8]
const ROWS = [-1.6, -0.5, 0.6, 1.7, 2.8]
// A seated person is a little behind their chair's center, so the figure sits on it.
const seat = (x: number, row: number): Vec => vec(x, ROWS[row] + 0.05)

const delegate = (n: number, at: Vec, doing: Doing, activity: Activity, coat: string, skin: string, hair: string, height: number, facing = NORTH): Person => ({
  id: `delegate${n}`,
  role: 'a delegate from up or down the Tanana or the Yukon',
  doing,
  activity,
  at,
  facing,
  coat,
  skin,
  hair,
  height,
})

export const people: readonly Person[] = [
  // The old man from Nenana, standing at the front to speak.
  { id: 'elder', role: 'the old man from Nenana', doing: 'speaking', activity: 'stand', at: vec(0.6, -3.6), facing: SOUTH, coat: '#3e3428', skin: '#9a6a48', hair: '#d4d0c8', height: 1.66 },
  // Eli, on his feet at his chair on the aisle, speaking for his family.
  { id: 'eli', role: 'Eli', doing: 'standing to speak', activity: 'stand', at: vec(-0.3, ROWS[1] - 0.3), facing: NORTH, coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 },
  // The woman at the front table who writes it all down.
  { id: 'recorder', role: 'a woman writing it all down', doing: 'writing it down', activity: 'sit', at: vec(-2.6, -4.85), facing: SOUTH, coat: '#5a4a5e', skin: '#a07050', hair: '#2a2420', height: 1.6 },
  // Lucy at the back wall, where she told Wade to stand.
  { id: 'lucy', role: 'Lucy', doing: 'watching', activity: 'stand', at: vec(-1.3, 4.8), facing: NORTH, coat: '#6a3b33', skin: '#a8754f', hair: '#16130f', height: 1.62 },
  // Ashby in the back, by the last row, in his good coat, handing out cards.
  { id: 'ashby', role: 'Franklin Ashby', doing: 'handing out cards', activity: 'stand', at: vec(2.7, 3.4), facing: -2.4, coat: '#3b3a3e', skin: '#e6c0a0', hair: '#9a9590', height: 1.8, meetingOnly: true },
  // The delegates, seated and listening, two with coffee; one at the urn.
  delegate(1, seat(-4.8, 0), 'listening', 'sit', '#5c4636', '#9e6c4a', '#cfcac0', 1.64),
  delegate(2, seat(-3.4, 0), 'listening', 'sit', '#2f3a48', '#8f6040', '#1a1714', 1.78),
  delegate(3, seat(1.1, 0), 'listening', 'sit', '#6e5a3c', '#a87652', '#3a3230', 1.7),
  delegate(4, seat(-5.5, 1), 'coffee', 'sitDrink', '#4a5a4a', '#94664a', '#8e8a84', 1.58),
  delegate(5, seat(0.4, 1), 'listening', 'sit', '#7a3e2e', '#a47250', '#141210', 1.82),
  delegate(6, seat(-4.1, 2), 'listening', 'sit', '#3a3a30', '#8c5e3e', '#5a524a', 1.73),
  delegate(7, seat(1.8, 2), 'coffee', 'sitDrink', '#5e5040', '#9c6a46', '#e0dcd4', 1.61),
  delegate(8, seat(-2.7, 3), 'listening', 'sit', '#46403a', '#a06e4c', '#221e1a', 1.69),
  delegate(9, vec(3.9, -2.2), 'coffee', 'drink', '#6a6050', '#8a5c3c', '#b0aaa2', 1.75, -2.0),
]

export const present = (p: Person, s: State): boolean => !p.meetingOnly || meeting(s)

const figures: readonly Figure[] = people.map((p) => ({
  id: p.id,
  at: p.at,
  facing: p.facing,
  coat: p.coat,
  skin: p.skin,
  hair: p.hair,
  height: p.height,
  activity: p.activity,
  ...(p.meetingOnly ? { when: (s: State) => present(p, s) } : {}),
}))

const wall = (x: number, z: number, w: number, d: number, color: string): Prop => ({ box: { x, z, w, d }, h: 3.0, color, solid: true, occludes: true })
const on = (x: number, z: number, w: number, d: number, y: number, h: number, color: string, shape?: 'cylinder'): Prop => ({
  box: { x, z, w, d },
  h,
  y,
  color,
  ...(shape ? { shape } : {}),
})
const flat = (x: number, z: number, w: number, d: number, color: string, y = 0): Prop => ({ box: { x, z, w, d }, h: 0.01, y, color, flat: true })

const plaster = '#a8a08c'
const steel = '#6a6c66'
const seatGray = '#7a7a70'
const pine = '#7a6040'
const NORTH_FACE = -D / 2 + 0.16
const SOUTH_FACE = D / 2 - 0.16
const EAST_FACE = W / 2 - 0.16

// A folding chair facing the front: the seat, and its back on the south side. Not solid: people sit on them.
const chair = (x: number, z: number): readonly Prop[] => [on(x, z, 0.42, 0.42, 0, 0.45, seatGray), on(x, z + 0.19, 0.42, 0.04, 0.45, 0.42, steel)]

// The pins on the map, scattered on its face, in the colors the scene names only as "colored".
const PINS: readonly (readonly [number, number, string])[] = [
  [-2.0, 1.9, '#b03a2e'], [-1.6, 1.6, '#2e5ab0'], [-1.1, 2.0, '#d0b030'], [-0.7, 1.5, '#b03a2e'],
  [-0.2, 1.8, '#3a8a40'], [-1.4, 1.3, '#2e5ab0'], [-0.4, 1.25, '#d0b030'], [-1.9, 1.45, '#3a8a40'],
]

// The dressing, piece by piece, named the way #203 lists the room.
export const pieces: Readonly<Record<string, readonly Prop[]>> = {
  chairs: WEST_XS.concat(EAST_XS).flatMap((x) => ROWS.flatMap((z) => chair(x, z))),
  // The map of the Interior taped to the north wall, the river lines on it, and its colored pins.
  map: [
    on(-1.2, NORTH_FACE + 0.01, 2.4, 0.02, 1.1, 1.2, '#d8cfb4'),
    on(-1.4, NORTH_FACE + 0.02, 1.8, 0.01, 1.6, 0.03, '#5a7a9a'),
    on(-0.9, NORTH_FACE + 0.02, 0.03, 0.01, 1.3, 0.6, '#5a7a9a'),
    ...PINS.map(([x, y, c]) => on(x, NORTH_FACE + 0.03, 0.05, 0.03, y, 0.05, c)),
  ],
  // The front table, the recorder's notebook and pencil on it, and a chair either end.
  frontTable: [
    { ...on(-1.6, -4.3, 3.0, 0.7, 0, 0.74, pine), solid: true },
    on(-2.6, -4.3, 0.3, 0.22, 0.74, 0.02, '#e8e2d0'),
    on(-2.4, -4.3, 0.14, 0.01, 0.76, 0.01, '#c8a040'),
    ...chair(-2.6, -4.9),
  ],
  // The coffee urn on its table, cups by it: the hall's sound comes from here (soundscape.ts URN_AT).
  coffee: [
    { ...on(URN.x, URN.z, 1.2, 0.6, 0, 0.74, pine), solid: true },
    on(URN.x, URN.z, 0.32, 0.32, 0.74, 0.5, '#b8b4a8', 'cylinder'),
    on(URN.x, URN.z, 0.36, 0.36, 1.24, 0.04, '#8a867a', 'cylinder'),
    ...[-0.4, -0.3, 0.35].map((dx) => on(URN.x + dx, URN.z + 0.1, 0.08, 0.08, 0.74, 0.1, '#e8e4d8', 'cylinder')),
  ],
  // The coat rack by the door, coats on it; the radiator under the east windows; the bulbs overhead.
  coats: [
    on(DOOR_X + 1.4, SOUTH_FACE - 0.1, 1.4, 0.06, 1.7, 0.06, '#3e2f20'),
    ...[['#4a4038', -0.4], ['#5a3a2a', 0.0], ['#3a4048', 0.4]].map(([c, dx]) => on(DOOR_X + 1.4 + Number(dx), SOUTH_FACE - 0.18, 0.4, 0.16, 0.9, 0.8, String(c))),
  ],
  radiator: [{ ...on(EAST_FACE - 0.1, 0.6, 0.2, 1.4, 0, 0.7, '#7a7a72'), solid: true }],
  windows: [-1.5, 2.5].map((z) => ({ ...on(EAST_FACE + 0.1, z, 0.05, 1.2, 1.0, 1.0, '#c8d0d8'), glow: true as const })),
  lights: [-4.0, -1.0, 2.0].flatMap((x) => [-2.0, 2.0].map((z) => ({ ...on(x, z, 0.3, 0.3, 2.5, 0.2, '#ffd9a0', 'cylinder'), glow: true as const }))),
  // The worn floor: boards, and the path worn up the aisle.
  floor: [flat(-1.5, 0.5, 1.9, 9.4, '#6a5440'), ...Array.from({ length: 10 }, (_, i) => flat(0, -5 + i, W - 0.3, 0.03, '#4a3a2a'))],
}

export const hall: Space = {
  id: 'hall',
  act: 'Act 2: Freeze-up',
  place: 'communityHall',
  name: 'The community hall',
  interior: true,
  size: { w: W, d: D },
  ground: '#5e4c38',
  spawn: SPAWN,
  props: [
    wall(0, -D / 2, W, 0.3, plaster),
    wall((-W / 2 + DOOR_X - DOOR / 2) / 2, D / 2, DOOR_X - DOOR / 2 + W / 2, 0.3, plaster),
    wall((W / 2 + DOOR_X + DOOR / 2) / 2, D / 2, W / 2 - DOOR_X - DOOR / 2, 0.3, plaster),
    wall(-W / 2, 0, 0.3, D, plaster),
    wall(W / 2, 0, 0.3, D, plaster),
    // The snow outside the open door, so the room does not end in black.
    { box: { x: DOOR_X, z: D / 2 + 0.6, w: DOOR + 0.6, d: 0.6 }, h: 0.02, color: '#d8dce0', flat: true },
    ...Object.values(pieces).flat(),
  ],
  figures,
  spots: [BACK_SPOT, FLOOR_SPOT, DOOR_SPOT, OUT_SPOT],
}

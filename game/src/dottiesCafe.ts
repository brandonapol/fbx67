import type { SceneId, State } from '../../text-game/src/types.ts'
import { GOSSIP_VISITS } from '../../text-game/src/scenes/gossip.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Interactable } from './world.ts'
import { vec } from './world.ts'

// The Northern Lights Café on Second Avenue (place `nlCafe`; docs/town-map.md), Dottie Vinson's counter: the optional
// stop at the story's three gossip points (#207). The story says when Wade is here: the café visit is a scene of its
// own at each point (`a2_co_gossip`, `a2_heat_gossip`, `a3_rash_gossip`, GOSSIP_VISITS in the story's gossip.ts), and
// this space routes only those scenes (router.ts reads `scenes`), so no other scene placed at the café walks in here.
// Wade comes in at the door off Second and walks to the counter, where Dottie has his cup poured before he sits; the
// scene's own text is what she says, its tiers the story's, and its menu is what he does next. Nothing here decides
// what she says or what a choice does.
//
// Gray-box primitives only (docs/art/assets.md); nothing carries lettering. Local x east, z south; the door is in
// the north wall, on Second Avenue, as the café's lot on the town map has it.

const W = 10
const D = 7
const DOOR = 1.2

// The scenes the café plays: the story's gossip visits, at whichever act they fall in.
export const CAFE_SCENES: readonly SceneId[] = GOSSIP_VISITS

export const visiting = (s: State): boolean => CAFE_SCENES.includes(s.scene)

export const DOOR_AT = vec(-2.5, -D / 2)
export const SPAWN = vec(DOOR_AT.x, -D / 2 + 0.8)

// The counter runs along the south wall; Wade's stool is the free one in the middle, his cup already on the counter in
// front of it, and Dottie stands behind it with the pot.
export const COUNTER_Z = 2.3
export const STOOL_XS: readonly number[] = [-3.2, -2.2, -1.2, -0.2, 0.8, 1.8]
export const STOOL_Z = 1.55
export const WADE_STOOL = vec(-0.2, STOOL_Z)
export const DOTTIE_AT = vec(0.1, 2.95)

export const COUNTER_SPOT: Interactable = { id: 'counter', x: WADE_STOOL.x, z: WADE_STOOL.z, r: 1.6, prompt: 'Sit at the counter' }

// The counter is there to use only on a gossip visit: then Dottie's read on the heat and the scene's menu come up.
export const counterSpot = (s: State, id: string): boolean => id === COUNTER_SPOT.id && visiting(s)

const wall = (x: number, z: number, w: number, d: number, color: string): Prop => ({ box: { x, z, w, d }, h: 3, color, solid: true, occludes: true })
const on = (x: number, z: number, w: number, d: number, y: number, h: number, color: string, shape?: 'cylinder'): Prop => ({
  box: { x, z, w, d },
  h,
  y,
  color,
  ...(shape ? { shape } : {}),
})

const plaster = '#c9b994'
const formica = '#b9c4b4'
const chrome = '#c8ccc8'
const vinyl = '#8a2e2a'
const steam = '#e9eef0'

// The dressing, piece by piece: the warm room out of the cold, burnt coffee on the burner, the windows fogged white.
export const pieces: Readonly<Record<string, readonly Prop[]>> = {
  // The north wall either side of the door, the other three whole.
  walls: [
    wall((-W / 2 + DOOR_AT.x - DOOR / 2) / 2, -D / 2, DOOR_AT.x - DOOR / 2 + W / 2, 0.2, plaster),
    wall((W / 2 + DOOR_AT.x + DOOR / 2) / 2, -D / 2, W / 2 - DOOR_AT.x - DOOR / 2, 0.2, plaster),
    wall(0, D / 2, W, 0.2, plaster),
    wall(-W / 2, 0, 0.2, D, plaster),
    wall(W / 2, 0, 0.2, D, plaster),
  ],
  // The counter with its pale top, and the chrome-legged stools in red vinyl along the front.
  counter: [
    { box: { x: -0.7, z: COUNTER_Z, w: 6.4, d: 0.7 }, h: 1.0, color: '#6a4a32', solid: true },
    on(-0.7, COUNTER_Z, 6.6, 0.8, 1.0, 0.05, formica),
  ],
  stools: STOOL_XS.flatMap((x) => [on(x, STOOL_Z, 0.08, 0.08, 0, 0.65, chrome, 'cylinder'), on(x, STOOL_Z, 0.4, 0.4, 0.65, 0.08, vinyl, 'cylinder')]),
  // Wade's cup, poured before he asks, at his stool; the pot on the burner behind the counter, and the urn.
  cup: [on(WADE_STOOL.x, COUNTER_Z - 0.2, 0.09, 0.09, 1.05, 0.09, '#efe9dc', 'cylinder')],
  burner: [
    on(1.7, 3.15, 0.9, 0.4, 0.95, 0.12, '#2e2c2a'),
    on(1.55, 3.15, 0.18, 0.18, 1.07, 0.24, '#3a2a1a', 'cylinder'),
    on(1.9, 3.15, 0.18, 0.18, 1.07, 0.24, '#3a2a1a', 'cylinder'),
    on(-2.6, 3.15, 0.45, 0.45, 0.95, 0.65, chrome, 'cylinder'),
  ],
  // The back counter along the south wall, the pie case on the counter's end, the register.
  backCounter: [{ box: { x: -0.7, z: 3.2, w: 6.4, d: 0.4 }, h: 0.95, color: '#5a3e2a' }],
  pieCase: [on(-3.4, COUNTER_Z, 0.7, 0.55, 1.05, 0.45, '#dfe8ea')],
  register: [on(2.1, COUNTER_Z, 0.45, 0.4, 1.05, 0.3, '#5e5a52')],
  // Two booths down the east wall, a table between high-backed benches.
  booths: [-1.6, 1.1].flatMap((z) => [
    { box: { x: 4.25, z, w: 0.9, d: 0.7 }, h: 0.75, color: formica, solid: true },
    { box: { x: 4.25, z: z - 0.75, w: 1.2, d: 0.45 }, h: 0.45, color: vinyl },
    { box: { x: 4.25, z: z + 0.75, w: 1.2, d: 0.45 }, h: 0.45, color: vinyl },
    { box: { x: 4.25, z: z + 1.0, w: 1.2, d: 0.1 }, h: 1.1, color: '#5a2420', solid: true },
  ]),
  // The windows on Second, fogged white with the warm air against thirty below, and the coat tree by the door.
  windows: [
    on(-4.0, -D / 2 + 0.12, 1.6, 0.04, 1.0, 1.2, steam),
    on(0.5, -D / 2 + 0.12, 2.2, 0.04, 1.0, 1.2, steam),
    on(3.5, -D / 2 + 0.12, 1.6, 0.04, 1.0, 1.2, steam),
  ],
  coatTree: [on(-4.3, -2.6, 0.08, 0.08, 0, 1.8, '#3a2a1a', 'cylinder'), on(-4.3, -2.6, 0.5, 0.35, 1.2, 0.6, '#4a4f3a')],
  // The oil heater in the west corner, and the hanging lamps over the counter: the only warmth Wade has had all day.
  heater: [{ box: { x: -4.4, z: 1.6, w: 0.6, d: 0.6 }, h: 1.0, color: '#3a3532', solid: true }],
  lamps: [-3.0, -0.7, 1.6].map((x): Prop => ({ ...on(x, COUNTER_Z - 0.3, 0.35, 0.35, 2.4, 0.18, '#ffd9a0', 'cylinder'), glow: true })),
  // A linoleum floor in checks down the aisle.
  floor: Array.from({ length: 8 }, (_, i): Prop => ({ box: { x: -4 + i * 1.1, z: 0.2, w: 0.55, d: 2.4 }, h: 0.01, color: '#d8d0bc', flat: true })),
}

export const props: readonly Prop[] = Object.values(pieces).flat()

// Dottie behind the counter with the pot; a trucker at the end stool and two in a booth, the town over coffee. The
// regulars are gray boxes in a look, as the town's other people are.
export const figures: readonly Figure[] = [
  { id: 'dottie', at: DOTTIE_AT, facing: Math.PI, coat: '#7a8fa0', skin: '#e3bfa0', hair: '#a8a29a', height: 1.6 },
  { id: 'trucker', at: vec(1.8, STOOL_Z), facing: Math.PI, coat: '#5a3a2a', skin: '#d9a982', hair: '#4a3a2a', height: 1.8, activity: 'sitDrink' },
  { id: 'regular1', at: vec(4.25, -2.35), facing: 0, coat: '#3e4a5a', skin: '#caa07a', hair: '#2a2420', height: 1.75, activity: 'sit' },
  { id: 'regular2', at: vec(4.25, -0.85), facing: Math.PI, coat: '#6b5a3a', skin: '#e0b896', hair: '#8a6a4a', height: 1.7, activity: 'sit' },
]

export const cafe: Space = {
  id: 'cafe',
  act: 'Act 2: Freeze-up',
  place: 'nlCafe',
  scenes: CAFE_SCENES,
  name: 'The Northern Lights Café',
  interior: true,
  size: { w: W, d: D },
  ground: '#6a5a44',
  spawn: SPAWN,
  props,
  figures,
  spots: [COUNTER_SPOT],
}

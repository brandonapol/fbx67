import type { State } from '../../text-game/src/types.ts'
import type { Figure, Prop } from './levels.ts'
import type { Interactable, Vec } from './world.ts'
import { angleTo, distance, vec } from './world.ts'
import type { Motion } from './cast.ts'
import { WALK_SPEED } from './cast.ts'
import type { Game } from './prologue.ts'
import { FLOAT } from './downtown.ts'
import { MOORED, MOORED_HEADING, PILOT_SEAT, flying, onBoard, seatAt } from './flight.ts'

// The float dock morning (p_dock, place floatDock), on the downtown map (docs/town-map.md, "Float dock"). Owen
// walks down from the boarding house past the post box on Cushman, where he can mail the letter to Lucy on the way: a
// hold at the box takes it out of his jacket. The walk is one mission to the story (docs/story-api.md, Rule 1): at the
// dock its menu offers the one note that says how it ended, `fly` with the letter in the mail or `keep` with it still
// in his jacket, and nothing is sent at the box. Leaving it unposted is allowed (#412). At the foot
// of the gangway Curly's floatplane lies alongside the dock, and Curly is out on the plane's near float with a hand
// pump in its compartment's hatch; the scene has him on one knee there, and the cast has no kneeling clip, so he
// stands at the pump. The scene's own menu comes up there, as its panel; its `fly` puts Owen in the right seat
// (flight.ts).
//
// What the player sees of how Curly works, against design.md: he keeps his plane in yellow tie-down line, a hank of
// it on the dock by the cleat off the coil in his hangar, and the plane is tied off to the dock's cleat with a
// bowline whose tail comes out of the nip outside the loop, the way the dock hand says he ties it, "like nobody ever
// showed him". That is the same line and the same knot Wade cuts off Owen's sawhorse in August (knot.ts); nothing here says so, and nothing here is a clue the story keeps.

export const MORNING = 'p_dock'

export const morning = (s: State): boolean => s.scene === MORNING

// The post box on Cushman, at the curb by the post office (downtown.ts POST_BOX): the hold to mail the letter.
export const POST_BOX = 'postBox'
export const POST_TIME = 1.0

export const postBoxSpot: Interactable = { id: POST_BOX, x: -4.5, z: 66, r: 1.5, prompt: 'Mail the letter', hold: POST_TIME }

// Whether the post box can be used: on the morning walk, until the letter is in it.
export const canMail = (s: State, mailed: boolean): boolean => morning(s) && !mailed

// The dock's note for how the walk down ended: the letter in the post box, or still in Owen's jacket.
export const dockNote = (mailed: boolean): 'fly' | 'keep' => (mailed ? 'fly' : 'keep')

// The same yellow braid as the line on Owen's sawhorse (knot.ts).
const yellow = '#d9b52a'

// The plane as it lies moored, and a point on its near float (the port one, toward the dock) `along` meters forward
// of the hull's middle, on the float's deck.
const moored = { at: MOORED, y: 0, heading: MOORED_HEADING }
const onFloat = (along: number): Vec => onBoard(moored, vec(1.3, along))
export const FLOAT_DECK = 0.45

// Where the tie-down line runs: from the cleat on the dock's east edge to the plane's near float strut.
const strutAt = onFloat(1.6)
export const CLEAT = vec(FLOAT[1] - 0.3, strutAt.z)

// Curly at the pump, kneeling on the plane's near float between its struts, facing the dock and Owen over it.
export const CURLY_ON_FLOAT = onFloat(0.6)
const TO_DOCK = -Math.PI / 2

export const dockProps: readonly Prop[] = [
  // The cleat, the tie-down line to the plane, the bowline's loop dropped over the cleat, the nip where the loop meets
  // the standing part, and the tail coming out of the nip outside the loop.
  { box: { x: CLEAT.x, z: CLEAT.z, w: 0.35, d: 0.12 }, h: 0.12, y: 0.12, color: '#4a4a46' },
  {
    box: { x: (CLEAT.x + strutAt.x) / 2, z: CLEAT.z, w: strutAt.x - CLEAT.x, d: 0.04 },
    h: 0.03,
    y: 0.3,
    color: yellow,
  },
  { box: { x: CLEAT.x, z: CLEAT.z, w: 0.3, d: 0.3 }, h: 0.04, y: 0.2, color: yellow, shape: 'cylinder' },
  { box: { x: CLEAT.x + 0.17, z: CLEAT.z, w: 0.09, d: 0.09 }, h: 0.07, y: 0.18, color: yellow, shape: 'cylinder' },
  { box: { x: CLEAT.x + 0.21, z: CLEAT.z + 0.16, w: 0.04, d: 0.24 }, h: 0.03, y: 0.15, color: yellow },
  // A hank of the same line on the dock by the cleat, off the coil he keeps in his hangar.
  { box: { x: CLEAT.x - 0.5, z: CLEAT.z + 0.8, w: 0.5, d: 0.5 }, h: 0.1, y: 0.12, color: yellow, shape: 'cylinder' },
  // The hand pump in the float compartment's hatch, at his left hand.
  { box: { x: CURLY_ON_FLOAT.x, z: CURLY_ON_FLOAT.z + 0.4, w: 0.18, d: 0.18 }, h: 0.02, y: FLOAT_DECK, color: '#4a4a46' },
  { box: { x: CURLY_ON_FLOAT.x, z: CURLY_ON_FLOAT.z + 0.4, w: 0.08, d: 0.08 }, h: 0.6, y: FLOAT_DECK, color: '#6b6b66', shape: 'cylinder' },
  // Owen's duffel on the float, waiting to go in the back.
  { box: { x: 119.4, z: -17.6, w: 0.9, d: 0.4 }, h: 0.35, y: 0.12, color: '#55603e', shape: 'cylinder' },
  // The post box's red lid over its blue body, the colors of 1967 (docs/fact-checks.md, item 30).
  { box: { x: -4.5, z: 66, w: 0.54, d: 0.54 }, h: 0.1, y: 1.2, color: '#a3302a' },
  // The letter going into the post box's slot, while Owen holds it there.
  { box: { x: -4.5, z: 66, w: 0.24, d: 0.03 }, h: 0.12, y: 1.15, color: '#efe6cf', while: 'posting' },
]

// Curly, out on the float by the plane, only on the morning.
export const dockFigures: readonly Figure[] = [
  { id: 'curly', cast: 'curly', at: CURLY_ON_FLOAT, facing: TO_DOCK, height: 1.75, during: 'floatDock', when: morning },
]

// His walkaround on the plane's near float while Owen comes down to the river: from the pump up to the float's bow and a
// look at the prop and the cowl, down the float's length to its heel and a look at the water rudder, and back to the
// pump. He walks at a walk and stops to look; it loops until Owen is down on the dock, and then he is at the pump, as
// the scene finds him. He looks at the line on the cleat in passing and never touches it. A pure function of the time.
const stops: readonly Readonly<{ at: Vec; wait: number; facing: number }>[] = [
  { at: CURLY_ON_FLOAT, wait: 5, facing: TO_DOCK },
  { at: onFloat(3.0), wait: 3, facing: Math.PI },
  { at: onFloat(-2.6), wait: 3, facing: 0 },
]

type Leg = Readonly<{ from: Vec; to: Vec; wait: number; facing: number; walk: number; start: number }>

const rounds: readonly Leg[] = stops.reduce<Leg[]>((acc, s, i) => {
  const to = stops[(i + 1) % stops.length]!.at
  const start = acc.length ? acc[acc.length - 1]!.start + acc[acc.length - 1]!.wait + acc[acc.length - 1]!.walk : 0
  return [...acc, { from: s.at, to, wait: s.wait, facing: s.facing, walk: distance(s.at, to) / WALK_SPEED, start }]
}, [])

export const ROUND_TIME = rounds.reduce((n, l) => n + l.wait + l.walk, 0)

export type Walker = Readonly<{ at: Vec; facing: number; speed: number }>

export const curlyRound = (t: number): Walker => {
  const u = ((t % ROUND_TIME) + ROUND_TIME) % ROUND_TIME
  const l = rounds.findLast((x) => x.start <= u) ?? rounds[0]!
  const k = u - l.start
  if (k < l.wait) return { at: l.from, facing: l.facing, speed: 0 }
  const f = (k - l.wait) / l.walk
  return { at: vec(l.from.x + (l.to.x - l.from.x) * f, l.from.z + (l.to.z - l.from.z) * f), facing: angleTo(l.from, l.to), speed: WALK_SPEED }
}

// Where Curly is drawn and what he is doing, where it is not simply where his figure stands: in the left seat while
// the plane flies, and on the plane's float on the morning. One pose a frame, so one clip.
export type Drawn = Readonly<{ at: Vec; y: number; heading: number; motion: Motion }>

const still: Motion = { speed: 0, sneaking: false, activity: 'stand', talking: false }

// Owen is down on the dock: Curly is back at the pump.
export const onDock = (at: Vec): boolean => at.x >= FLOAT[0] && at.x <= FLOAT[1] && at.z >= FLOAT[2] && at.z <= FLOAT[3]

export const curlyAt = (g: Pick<Game, 'space' | 'story' | 'flight' | 'panel' | 't' | 'pos'>): Drawn | undefined => {
  if (flying(g.flight)) return { ...seatAt(g.flight, PILOT_SEAT), motion: { ...still, activity: 'sit' } }
  if (g.space !== 'downtown' || !morning(g.story)) return undefined
  const w = g.panel || onDock(g.pos) ? { at: CURLY_ON_FLOAT, facing: TO_DOCK, speed: 0 } : curlyRound(g.t)
  return { at: w.at, y: FLOAT_DECK, heading: w.facing, motion: { ...still, speed: w.speed, talking: g.panel !== undefined } }
}

import type { State } from '../../text-game/src/types.ts'
import type { Figure, Prop } from './levels.ts'
import type { Interactable } from './world.ts'
import { vec } from './world.ts'
import { FLOAT } from './downtown.ts'
import { MOORED, MOORED_HEADING, onBoard } from './flight.ts'

// The float dock morning (p_dock, place floatDock), on the downtown map (docs/town-map.md, "Float dock"). Owen
// walks down from the boarding house past the post box on Cushman, where he can mail the letter to Lucy on the way: a
// hold at the box. The story doesn't track it (the scene's text has already sent it), so nothing is sent. At the foot
// of the gangway Curly's floatplane lies alongside the float, and Curly is out on the float by it with a hand pump.
// The scene's own menu comes up there, as its panel; its `fly` puts Owen in the right seat (flight.ts).
//
// What the player sees of how Curly works, against design.md: he keeps his plane in yellow tie-down line, a coil of
// it on the float by his feet, and the plane is tied off to the float's cleat with the tail outside the loop, the way
// the dock hand says he ties it, "like nobody ever showed him". That is the same line and the same knot Wade cuts off
// Owen's sawhorse in August (knot.ts); nothing here says so, and nothing here is a clue the story keeps.

export const MORNING = 'p_dock'

export const morning = (s: State): boolean => s.scene === MORNING

// The post box on Cushman, at the curb by the post office (downtown.ts POST_BOX): the hold to mail the letter.
export const POST_BOX = 'postBox'
export const POST_TIME = 1.0

export const postBoxSpot: Interactable = { id: POST_BOX, x: -4.5, z: 66, r: 1.5, prompt: 'Mail the letter', hold: POST_TIME }

// Whether the post box can be used: on the morning walk, until the letter is in it.
export const canMail = (s: State, mailed: boolean): boolean => morning(s) && !mailed

const yellow = '#d8b22a'

// Where the tie-down line runs: from the cleat on the float's east edge to the plane's near float strut.
const strutAt = onBoard({ at: MOORED, y: 0, heading: MOORED_HEADING }, vec(1.3, 1.6))
export const CLEAT = vec(FLOAT[1] - 0.3, strutAt.z)

export const CURLY_ON_FLOAT = vec(FLOAT[1] - 0.8, -14.6)

export const dockProps: readonly Prop[] = [
  // The cleat, the tie-down line to the plane, the bowline's loop around the cleat with its tail hanging outside it.
  { box: { x: CLEAT.x, z: CLEAT.z, w: 0.35, d: 0.12 }, h: 0.12, y: 0.12, color: '#4a4a46' },
  {
    box: { x: (CLEAT.x + strutAt.x) / 2, z: CLEAT.z, w: strutAt.x - CLEAT.x, d: 0.04 },
    h: 0.03,
    y: 0.3,
    color: yellow,
  },
  { box: { x: CLEAT.x, z: CLEAT.z, w: 0.3, d: 0.3 }, h: 0.04, y: 0.2, color: yellow, shape: 'cylinder' },
  { box: { x: CLEAT.x - 0.22, z: CLEAT.z + 0.12, w: 0.04, d: 0.28 }, h: 0.03, y: 0.14, color: yellow },
  // The coil he keeps the line in, by his feet on the float, and the hand pump.
  { box: { x: CURLY_ON_FLOAT.x - 0.9, z: CURLY_ON_FLOAT.z - 0.6, w: 0.6, d: 0.6 }, h: 0.12, y: 0.12, color: yellow, shape: 'cylinder' },
  { box: { x: CURLY_ON_FLOAT.x + 0.3, z: CURLY_ON_FLOAT.z + 0.5, w: 0.08, d: 0.08 }, h: 0.8, y: 0.12, color: '#6b6b66', shape: 'cylinder' },
  // Owen's duffel on the float, waiting to go in the back.
  { box: { x: 119.4, z: -17.6, w: 0.9, d: 0.4 }, h: 0.35, y: 0.12, color: '#55603e', shape: 'cylinder' },
  // The letter going into the post box's slot, while Owen holds it there.
  { box: { x: -4.5, z: 66, w: 0.24, d: 0.03 }, h: 0.12, y: 1.15, color: '#efe6cf', while: 'posting' },
]

// Curly, out on the float by the plane, only on the morning.
export const dockFigures: readonly Figure[] = [
  { id: 'curly', at: CURLY_ON_FLOAT, facing: Math.PI / 2, coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75, during: 'floatDock', when: morning },
]

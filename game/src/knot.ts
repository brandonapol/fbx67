import type { State } from '../../text-game/src/types.ts'
import { mission } from '../../text-game/src/story.ts'
import type { Prop } from './levels.ts'
import type { Shot } from './render.ts'
import type { Interactable, Vec } from './world.ts'
import { add, distance, scale, sub, vec } from './world.ts'

// The knot close-up at the cabin (a1_body, docs/acts/act1-missions.md section 2, #168): the ride is over, the body off
// the bow, and Wade leans over the gunwale to look. The camera goes close on the yellow line: a bowline, its loop
// around the top of Owen's shirt, the tail sitting outside the loop. What happens next is the scene's own menu (show
// Eli, or cut it and say nothing); nothing here decides what a choice does or what anyone says.

// Where the body is, and the drowned sawhorse it is tied to, north of it under the water. BODY_AT is the north end of
// the body, where the line is tied on.
export const BODY_AT = vec(4.1, -9.4)
export const SAWHORSE_AT = vec(4.1, -11.0)

// The bowline's loop lies around the top of the shirt; the nip, where the knot is, at the loop's north side, and the
// standing part runs on from it to the sawhorse.
export const LOOP_R = 0.2
export const LOOP_AT = vec(BODY_AT.x, BODY_AT.z - 0.05)
export const KNOT_AT = vec(LOOP_AT.x, LOOP_AT.z - LOOP_R)

// The tail leaves the nip away from the loop, to the north-east: outside it, where Wade's cousins never left one.
export const TAIL_END = add(KNOT_AT, vec(0.2, -0.17))

const braid = '#d9b52a'
const BEAD = 0.04
const STEP = 0.028
const LINE_Y = 0.05

const bead = (p: Vec, size = BEAD, y = LINE_Y): Prop => ({ box: { x: p.x, z: p.z, w: size, d: size }, h: size * 0.8, y, color: braid })

// A strand of braided line from a to b, as close-set beads (props are not rotated, so a slant is beads).
const strand = (a: Vec, b: Vec): readonly Vec[] => {
  const n = Math.max(1, Math.ceil(distance(a, b) / STEP))
  return Array.from({ length: n + 1 }, (_, i) => add(a, scale(sub(b, a), i / n)))
}

const LOOP_BEADS = Math.ceil((2 * Math.PI * LOOP_R) / STEP)

export const loop: readonly Vec[] = Array.from({ length: LOOP_BEADS }, (_, i) => {
  const a = (2 * Math.PI * i) / LOOP_BEADS
  return add(LOOP_AT, vec(LOOP_R * Math.sin(a), LOOP_R * Math.cos(a)))
})

export const tail: readonly Vec[] = strand(KNOT_AT, TAIL_END)

export const knotProps: readonly Prop[] = [
  // The standing part, taut along the surface from the sawhorse to the knot.
  { box: { x: KNOT_AT.x, z: (KNOT_AT.z + SAWHORSE_AT.z) / 2, w: BEAD, d: KNOT_AT.z - SAWHORSE_AT.z }, h: 0.03, y: 0.01, color: braid },
  // The nip: the collar the standing part makes round the loop's two legs, a little fatter than the line.
  { box: { x: KNOT_AT.x, z: KNOT_AT.z, w: 0.1, d: 0.08 }, h: 0.05, y: LINE_Y - 0.01, color: braid },
  ...loop.map((p) => bead(p)),
  ...tail.map((p) => bead(p)),
]

// Wade leans over the gunwale to look: the spot is the knot, reached from the thwart where the ride ends.
export const KNOT_SPOT: Interactable = { id: 'knot', x: KNOT_AT.x, z: KNOT_AT.z, r: 5, prompt: 'Lean over the gunwale and look' }

// The knot is there to look at only where the story's mission at the body starts; after the choice Wade has cut it.
export const knotSpot = (s: State, id: string): boolean => id === KNOT_SPOT.id && mission(s)?.id === 'theBody'

// The close-up: from over the gunwale on the boat's side, down on the loop, the nip and the tail.
export const KNOT_SHOT: Shot = { eye: [KNOT_AT.x - 0.55, 0.85, KNOT_AT.z + 0.75], at: [LOOP_AT.x + 0.02, LINE_Y, LOOP_AT.z - 0.08] }

export type Look = 'knot'

// The shot the camera holds while Wade is looking, if he is.
export const closeUp = (look: Look | undefined, space: string): Shot | undefined => (look === 'knot' && space === 'cabin' ? KNOT_SHOT : undefined)

import type { State } from '../../text-game/src/types.ts'
import { menu, offers, place } from '../../text-game/src/story.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Shot } from './render.ts'
import type { Interactable, Vec } from './world.ts'
import { add, vec } from './world.ts'

// Curly's November, a2_curly to a2_flight (#131, #182, #183), as its first pass plays it: three gray-box Act 2 spaces.
//
// - The bush strip (place `bushStrip`, a2_curly): planes coming off floats onto skis. Curly lashes a tarp over a wing
//   with yellow braided line off the coil on his bench and ties it off at the tie-down post. Wade can stand and watch
//   him work, which holds the camera on Curly's hands at the post: the bowline, backward, the tail outside the loop.
//   Nothing in the UI names the knot, and watching sends nothing: the story grants the evidence on either answer to
//   Curly's invitation, as the text does. Talking to Curly opens the scene's own menu.
// - The Silver Pan in Act 2 (place `silverPan`): the steak (a2_steak), Curly's roll of twenties out on the table, and on
//   the confront path the steak-night confrontation (a2_confront, a2_confront_knot). Sitting down with Curly opens the
//   scene's menu.
// - Outside the base hangar (place `baseHangar`, a2_jake): Jake, six foot seven, in the door he has to duck under.
//   Hearing him out opens decision 3: the scene's three notes and nothing else, no way to step back from it and no
//   clock, as decision 1 at the jail is asked.
//
// The game sends the scenes' notes and reads their menus; nothing here decides what a choice does. Local x east, z
// south, as every space.

export type StripSpace = 'strip' | 'steak' | 'hangar'

// --- The bush strip ---

const STRIP_W = 34
const STRIP_D = 22

export const STRIP_SPAWN = vec(-12, 7)
export const STRIP_FACING = Math.PI / 2

// Curly's plane, on skis now, nose east; its port wing reaches south over the bench, the tarp lashed over it.
const PLANE_AT = vec(2, -2)
const WING_Y = 2.3
const WING_TIP = vec(PLANE_AT.x - 0.3, PLANE_AT.z + 5.4)

// The tie-down post under the port wingtip, where Curly ties the tarp's line off, and the bench with the coil.
export const POST_AT = vec(WING_TIP.x, WING_TIP.z + 0.4)
const POST_H = 0.9
export const BENCH_AT = vec(POST_AT.x - 3.2, POST_AT.z + 1.2)

// Curly stands at the post, facing it from the west, the bench at his back.
export const CURLY_AT = vec(POST_AT.x - 0.75, POST_AT.z)

// The line: a bowline round the post, its loop at the post's top, the nip on the loop's west side where the standing
// part comes down from the tarp, and the tail leaving the nip away from the loop, outside it.
const LINE_Y = POST_H - 0.12
const LOOP_R = 0.13
const NIP = vec(POST_AT.x - LOOP_R, POST_AT.z)
const TAIL_END = add(NIP, vec(-0.17, 0.14))
const braid = '#d9b52a'
const BEAD = 0.035
const STEP = 0.026

const bead = (p: Vec, y = LINE_Y): Prop => ({ box: { x: p.x, z: p.z, w: BEAD, d: BEAD }, h: BEAD * 0.8, y, color: braid })

const strand = (a: Vec, b: Vec): readonly Vec[] => {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / STEP))
  return Array.from({ length: n + 1 }, (_, i) => vec(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n))
}

const LOOP_BEADS = Math.ceil((2 * Math.PI * LOOP_R) / STEP)

export const loop: readonly Vec[] = Array.from({ length: LOOP_BEADS }, (_, i) => {
  const a = (2 * Math.PI * i) / LOOP_BEADS
  return add(POST_AT, vec(LOOP_R * Math.cos(a), LOOP_R * Math.sin(a)))
})

export const tail: readonly Vec[] = strand(NIP, TAIL_END)

// The standing part, from the tarp's grommet at the wingtip down to the nip, in beads that climb as they go.
const RISE = 12
const standing: readonly Prop[] = Array.from({ length: RISE + 1 }, (_, i) => {
  const k = i / RISE
  return bead(vec(NIP.x + (WING_TIP.x - NIP.x) * k, NIP.z + (WING_TIP.z - NIP.z) * k), LINE_Y + (WING_Y - LINE_Y) * k)
})

export const lineProps: readonly Prop[] = [
  ...standing,
  { box: { x: NIP.x, z: NIP.z, w: 0.07, d: 0.09 }, h: 0.05, y: LINE_Y - 0.01, color: braid },
  ...loop.map((p) => bead(p)),
  ...tail.map((p) => bead(p)),
]

const snow = '#e4e7ea'
const hull = '#d9d2bd'
const band = '#9b2f22'
const tarp = '#4f5a3c'
const wood = '#6b5038'
const alloy = '#b9bcbc'

// A high-wing plane in its own frame, at `at` with its nose east: on skis, or with its floats off on blocks beside it.
const plane = (at: Vec, gear: 'skis' | 'blocks', color: string): readonly Prop[] => [
  { box: { x: at.x, z: at.z, w: 5.0, d: 1.2 }, h: 1.3, y: 0.7, color, solid: true, occludes: true },
  { box: { x: at.x, z: at.z, w: 5.0, d: 1.24 }, h: 0.16, y: 1.25, color: band },
  { box: { x: at.x + 0.4, z: at.z, w: 1.6, d: 11 }, h: 0.14, y: WING_Y, color },
  { box: { x: at.x - 3.6, z: at.z, w: 0.9, d: 3.4 }, h: 0.08, y: 1.5, color },
  { box: { x: at.x - 3.6, z: at.z, w: 1.1, d: 0.1 }, h: 1.4, y: 1.5, color },
  ...(gear === 'skis'
    ? [-0.9, 0.9].map((dz): Prop => ({ box: { x: at.x + 0.6, z: at.z + dz, w: 2.2, d: 0.35 }, h: 0.08, color: '#2c2c2a' }))
    : [-1.3, 1.3].map((dz): Prop => ({ box: { x: at.x, z: at.z + dz + 3, w: 6.4, d: 0.5 }, h: 0.45, y: 0.3, color: alloy, solid: true }))),
  ...(gear === 'blocks' ? [{ box: { x: at.x, z: at.z, w: 3, d: 0.8 }, h: 0.7, color: wood, solid: true } satisfies Prop] : []),
]

const stripProps: readonly Prop[] = [
  // The strip itself, packed snow, the treeline beyond it, the hangar shed on the north side.
  { box: { x: 0, z: -9, w: STRIP_W, d: 3 }, h: 6, color: '#2e3b2c', solid: true, occludes: true },
  { box: { x: -8, z: -6.5, w: 7, d: 2.5 }, h: 4.2, color: '#6e655a', solid: true, occludes: true },
  ...plane(PLANE_AT, 'skis', hull),
  // The tarp over the port wing, hanging a little over the leading and trailing edges.
  { box: { x: PLANE_AT.x + 0.4, z: PLANE_AT.z + 3.0, w: 1.9, d: 5.0 }, h: 0.06, y: WING_Y + 0.14, color: tarp },
  { box: { x: PLANE_AT.x + 1.32, z: PLANE_AT.z + 3.0, w: 0.04, d: 5.0 }, h: 0.35, y: WING_Y - 0.2, color: tarp },
  // The second plane, its floats off and on the snow beside it, waiting on its skis.
  ...plane(vec(11, 3), 'blocks', '#c2c6b4'),
  // The tie-down post, and the bench with the coil of yellow line on it.
  { box: { x: POST_AT.x, z: POST_AT.z, w: 0.14, d: 0.14 }, h: POST_H, color: wood, solid: true },
  { box: { x: BENCH_AT.x, z: BENCH_AT.z, w: 1.8, d: 0.6 }, h: 0.85, color: wood, solid: true },
  { box: { x: BENCH_AT.x + 0.4, z: BENCH_AT.z, w: 0.36, d: 0.36 }, h: 0.12, y: 0.85, color: braid, shape: 'cylinder' },
  ...lineProps,
]

const curly: Figure = { id: 'curly', cast: 'curly', at: CURLY_AT, facing: Math.PI / 2, height: 1.75, activity: 'stand' }

// Talking to Curly opens the scene's menu; watching him is only a look.
export const CURLY_SPOT: Interactable = { id: 'curly', x: CURLY_AT.x, z: CURLY_AT.z, r: 2.2, prompt: 'Talk to Curly' }
export const WATCH_SPOT: Interactable = { id: 'watch', x: BENCH_AT.x, z: BENCH_AT.z, r: 1.8, prompt: 'Watch him work' }

export const strip: Space = {
  id: 'strip',
  act: 'Act 2: Freeze-up',
  place: 'bushStrip',
  name: 'The bush strip',
  interior: false,
  size: { w: STRIP_W, d: STRIP_D },
  ground: snow,
  spawn: STRIP_SPAWN,
  props: stripProps,
  figures: [curly],
  // Curly first: a player who walks to the first thing to use talks to him.
  spots: [CURLY_SPOT, WATCH_SPOT],
}

// The camera on Curly's hands at the post, from beside the bench: the loop round the post's top, the nip, the tail.
export const TIE_SHOT: Shot = { eye: [POST_AT.x - 1.0, LINE_Y + 0.75, POST_AT.z + 0.9], at: [POST_AT.x - 0.05, LINE_Y, POST_AT.z] }

export type TieLook = 'tie'

export const tieShot = (look: string | undefined, space: string): Shot | undefined => (look === 'tie' && space === 'strip' ? TIE_SHOT : undefined)

// --- The Silver Pan, Act 2 ---

const PAN_W = 12
const PAN_D = 10

export const PAN_SPAWN = vec(0, PAN_D / 2 - 0.7)
export const BOOTH_AT = vec(3.2, 0.4)
const CURLY_SEAT = vec(BOOTH_AT.x, BOOTH_AT.z - 0.7)
export const ROLL_AT = vec(BOOTH_AT.x - 0.25, BOOTH_AT.z - 0.15)

const panWall = (x: number, z: number, w: number, d: number): Prop => ({ box: { x, z, w, d }, h: 3, color: '#7a5a3f', solid: true, occludes: true })

const panProps: readonly Prop[] = [
  panWall(0, -PAN_D / 2, PAN_W, 0.3),
  panWall(-PAN_W / 4 - 0.4, PAN_D / 2, PAN_W / 2 - 0.8, 0.3),
  panWall(PAN_W / 4 + 0.4, PAN_D / 2, PAN_W / 2 - 0.8, 0.3),
  panWall(-PAN_W / 2, 0, 0.3, PAN_D),
  panWall(PAN_W / 2, 0, 0.3, PAN_D),
  // The counter and the back bar, the stove's glow in the window.
  { box: { x: -1.5, z: -3.4, w: 7, d: 0.8 }, h: 1.1, color: '#3e2618', solid: true, occludes: true },
  { box: { x: -1.5, z: -4.6, w: 8, d: 0.4 }, h: 2.2, color: '#4a2f1e', solid: true },
  { box: { x: 5.85, z: -0.5, w: 0.1, d: 2.6 }, h: 1.6, y: 0.9, color: '#ffc27a', glow: true },
  // The booth: the table, two benches, two plates.
  { box: { x: BOOTH_AT.x, z: BOOTH_AT.z, w: 1.4, d: 0.9 }, h: 0.76, color: '#6e4a30', solid: true },
  { box: { x: BOOTH_AT.x, z: BOOTH_AT.z - 0.85, w: 1.6, d: 0.5 }, h: 0.46, color: '#4a3020', solid: true },
  { box: { x: BOOTH_AT.x, z: BOOTH_AT.z + 0.85, w: 1.6, d: 0.5 }, h: 0.46, color: '#4a3020', solid: true },
  ...[-0.2, 0.2].map((dz): Prop => ({ box: { x: BOOTH_AT.x + 0.3, z: BOOTH_AT.z + dz, w: 0.32, d: 0.3 }, h: 0.02, y: 0.76, color: '#e4e0d4' })),
  // Curly's roll of twenties, out on the table while he pays for the steak.
  { box: { x: ROLL_AT.x, z: ROLL_AT.z, w: 0.08, d: 0.08 }, h: 0.07, y: 0.76, color: '#7f9a6c', shape: 'cylinder' },
]

// Steak night is the one Wade asks for, on the confront path (curlyPlan, set at decision 3); the steak Curly pays for
// comes before it, when nothing is planned. The roll of twenties is out only at the steak he pays for.
const steakNight = (s: State): boolean => place(s) === 'silverPan' && s.curlyPlan === 'confront'

export const rollOut = (s: State): boolean => place(s) === 'silverPan' && s.curlyPlan === undefined

// Leaned on, Curly has gone: steak night's menu no longer offers letting it drop.
export const leftEarly = (s: State): boolean => steakNight(s) && !offers(s, 'letDrop')

const panFigures: readonly Figure[] = [
  { id: 'hank', cast: 'hank', at: vec(-1.5, -4.0), facing: 0, height: 1.8, activity: 'stand' },
  // Curly is at the booth until Wade leans on him about the knot, and he leaves before his steak comes.
  { id: 'curly', cast: 'curly', at: CURLY_SEAT, facing: 0, height: 1.75, activity: 'sit', when: (s) => !leftEarly(s) },
]

export const BOOTH_SPOT: Interactable = { id: 'booth', x: BOOTH_AT.x, z: BOOTH_AT.z, r: 2.0, prompt: 'Sit down with Curly' }

export const steak: Space = {
  id: 'steak',
  act: 'Act 2: Freeze-up',
  place: 'silverPan',
  name: 'The Silver Pan',
  interior: true,
  size: { w: PAN_W, d: PAN_D },
  ground: '#5a3d2b',
  spawn: PAN_SPAWN,
  props: panProps,
  figures: panFigures,
  spots: [BOOTH_SPOT],
}


// --- Outside the base hangar ---

const HANGAR_W = 24
const HANGAR_D = 16

export const HANGAR_SPAWN = vec(0, 5)
// The hangar's personnel door, in its south wall, lower than Jake is tall.
export const DOOR_AT = vec(0, -3)
export const DOOR_H = 1.95
export const JAKE_HEIGHT = 2.01
const JAKE_AT = vec(DOOR_AT.x + 0.2, DOOR_AT.z + 0.7)

const hangarProps: readonly Prop[] = [
  // The hangar's south wall either side of the door, the wall over it, the big doors shut beyond.
  { box: { x: -6.5, z: DOOR_AT.z - 0.15, w: 12, d: 0.3 }, h: 7, color: '#7c8478', solid: true, occludes: true },
  { box: { x: 6.5, z: DOOR_AT.z - 0.15, w: 12, d: 0.3 }, h: 7, color: '#7c8478', solid: true, occludes: true },
  { box: { x: 0, z: DOOR_AT.z - 0.15, w: 1.0, d: 0.3 }, h: 7 - DOOR_H, y: DOOR_H, color: '#7c8478', solid: true },
  { box: { x: 0, z: DOOR_AT.z - 0.4, w: 1.0, d: 0.2 }, h: DOOR_H, color: '#2d302c', solid: true, occludes: true },
  { box: { x: 7, z: DOOR_AT.z + 0.05, w: 8, d: 0.12 }, h: 5.5, color: '#646b62' },
  // A drum of oil and a tool cart by the door, the plowed snow along the apron.
  { box: { x: -1.6, z: DOOR_AT.z + 0.6, w: 0.6, d: 0.6 }, h: 0.9, color: '#40522f', solid: true, shape: 'cylinder' },
  { box: { x: 1.8, z: DOOR_AT.z + 0.7, w: 1.0, d: 0.6 }, h: 0.9, color: '#8a2e22', solid: true },
  { box: { x: 0, z: HANGAR_D / 2 - 1, w: HANGAR_W, d: 1.2 }, h: 0.8, color: snow, solid: true },
]

// How Jake looks, here and at the wreck in Act 3 (engineOut.ts).
export const jakeLook = { coat: '#5b4a32', skin: '#d8a880', hair: '#8a5a32' } as const

const jake: Figure = { ...jakeLook, id: 'jake', at: JAKE_AT, facing: 0, height: JAKE_HEIGHT, activity: 'stand' }

export const JAKE_SPOT: Interactable = { id: 'jake', x: JAKE_AT.x, z: JAKE_AT.z, r: 2.0, prompt: 'Hear Jake out' }

export const hangar: Space = {
  id: 'hangar',
  act: 'Act 2: Freeze-up',
  place: 'baseHangar',
  name: 'The base hangar',
  interior: false,
  size: { w: HANGAR_W, d: HANGAR_D },
  ground: snow,
  spawn: HANGAR_SPAWN,
  props: hangarProps,
  figures: [jake],
  spots: [JAKE_SPOT],
}

export const stripSpaces: Readonly<Record<StripSpace, Space>> = { strip, steak, hangar }

export const isStripSpace = (id: string): id is StripSpace => id in stripSpaces

// --- What the spots do ---

// Each space's spots are there to use while the story is at that space's place.
export const stripSpot = (s: State, space: StripSpace, id: string): boolean =>
  place(s) === stripSpaces[space].place && stripSpaces[space].spots.some((i) => i.id === id)

// What using a spot does: the scene's notes it offers, the button to step back (none, for decision 3), and the look
// the camera holds. Watching Curly offers no note and shows none of the scene's text: it is a look and nothing more.
export type Use = Readonly<{ notes: readonly string[]; back?: string; look?: TieLook; quiet?: true }>

const notesOf = (s: State): readonly string[] => menu(s).options.map((o) => o.note)

export const useSpot = (s: State, space: StripSpace, id: string): Use | undefined => {
  if (!stripSpot(s, space, id)) return undefined
  if (space === 'strip' && id === WATCH_SPOT.id) return { notes: [], back: 'Look away.', look: 'tie', quiet: true }
  // Decision 3 is Wade's to make, deliberately and with no clock: no way to walk off from it.
  if (space === 'hangar') return { notes: notesOf(s) }
  return { notes: notesOf(s), back: 'Step back.' }
}

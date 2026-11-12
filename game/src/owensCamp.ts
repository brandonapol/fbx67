import type { CacheSpot, State } from '../../text-game/src/types.ts'
import { cacheIsAt } from '../../text-game/src/logic.ts'
import { digLabels } from '../../text-game/src/scenes/act3.ts'
import { clock, menu } from '../../text-game/src/story.ts'
import { N } from '../../text-game/src/names.ts'
import { CACHE, CRATES, MARKER, STOVE, STOVE_AT, TENT, campProps } from './camp.ts'
import { CREEK_FAR, CREEK_NEAR } from './campGround.ts'
import type { Figure, Prop, Space } from './levels.ts'
import { JAKE_HEIGHT } from './bushStrip.ts'
import type { Exposure, Failure, Run } from './survival.ts'
import { begin, expose, failure, handTime, reach, retry } from './survival.ts'
import type { Interactable, Vec } from './world.ts'
import { vec } from './world.ts'

// Lucy's dig at Owen's survey camp (docs/acts/act3-missions.md, section 1; #139): 12 December, thirty-eight below. The
// space is the prologue's camp (camp.ts), the same ground and the same three places Owen could hide his notes, with the
// winter laid over it as data: snow on the bar, the creek frozen, the tent slashed, the crates emptied and the stove
// kicked over, and Jake's plane on the ice with its engine warm.
//
// Nothing here decides where the notes are. The first dig sends the spot as a3_camp's note and the story answers
// (a3_found or a3_wrong_spot); after a wrong one the story asks only for the dig in the right place, and which place
// that is the engine reads from the story's own gate, cacheIsAt over owenCache. Further wrong digs cost light and
// fingers, never story (Rule 4). The light and the cold are survival.ts's: a run with two checkpoints, stepping off
// the plane and the first spot dug.

// --- The camp in winter ----------------------------------------------------------------------------------------------

// Jake's plane on the creek ice below the camp, nosed upstream, and Jake by its door on the bar.
export const PLANE = vec(-8.6, (CREEK_NEAR + CREEK_FAR) / 2)
export const JAKE_AT = vec(-7.6, CREEK_NEAR - 0.7)
// Lucy steps off the plane onto the bar beside him, facing the camp.
export const SPAWN = vec(-7.0, CREEK_NEAR - 2.8)
export const SPAWN_FACING = Math.PI * 0.85

const snow = '#dfe3e6'
const drift = '#cfd6dc'
const ice = '#a9bcc6'
const canvas = '#a39a80'

// The winter over the camp. Flat cover adds nothing solid, so the prologue's collision holds; the kicked-over stove and
// the plane on the ice stop Lucy.
export const winter: readonly Prop[] = [
  // Snow over the bar and the tussocks, and the creek frozen bank to bank.
  { box: { x: 0, z: -2, w: 28, d: 20 }, h: 0.02, y: 0.03, color: snow, flat: true },
  { box: { x: 0, z: (CREEK_NEAR + CREEK_FAR) / 2, w: 28, d: CREEK_FAR - CREEK_NEAR }, h: 0.02, color: ice, flat: true },
  // Drifts in the lee of the tent and the crates.
  { box: { x: TENT.x - TENT.w / 2 - 0.4, z: TENT.z, w: 0.8, d: TENT.d + 0.6 }, h: 0.35, color: drift },
  { box: { x: TENT.x + TENT.w / 2 + 0.3, z: TENT.z - 0.6, w: 0.6, d: 2.0 }, h: 0.25, color: drift },
  // The tent slashed: its south wall hangs open in two flaps either side of the door.
  { box: { x: TENT.x - 1.1, z: TENT.z + TENT.d / 2 + 0.2, w: 1.0, d: 0.06 }, h: 0.9, color: canvas },
  { box: { x: TENT.x + 1.2, z: TENT.z + TENT.d / 2 + 0.25, w: 0.9, d: 0.06 }, h: 0.7, color: canvas },
  // The stove kicked over out of the door onto its side, its pipe in the snow.
  { box: { x: STOVE_AT.x + 1.9, z: STOVE_AT.z + 1.8, w: 0.75, d: 0.5 }, h: 0.45, color: '#403c38', solid: true },
  { box: { x: STOVE_AT.x + 2.6, z: STOVE_AT.z + 2.2, w: 1.4, d: 0.12 }, h: 0.12, color: '#3a3836' },
  // The crates emptied: lids off and what was in them thrown on the snow.
  ...CRATES.map((c, i): Prop => ({ box: { x: c.at.x - 0.7, z: c.at.z + 0.3 * (i - 1), w: 0.6, d: 0.04 }, h: 0.02, color: '#7a6248', flat: true })),
  { box: { x: 7.3, z: -0.7, w: 0.5, d: 0.35 }, h: 0.05, color: '#c9c0a8', flat: true },
  { box: { x: 7.9, z: -0.3, w: 0.3, d: 0.4 }, h: 0.05, color: '#8a7c5a', flat: true },
  // Jake's plane on the ice: on skis, high wing, the cowling's exhaust smoking in the cold.
  { box: { x: PLANE.x, z: PLANE.z, w: 1.0, d: 6.4 }, h: 1.1, y: 0.6, color: '#b8432f', solid: true, occludes: true },
  { box: { x: PLANE.x, z: PLANE.z - 0.6, w: 10.4, d: 1.5 }, h: 0.12, y: 1.9, color: '#e3d9c2' },
  { box: { x: PLANE.x - 0.7, z: PLANE.z - 0.4, w: 0.25, d: 2.2 }, h: 0.12, color: '#8a8478' },
  { box: { x: PLANE.x + 0.7, z: PLANE.z - 0.4, w: 0.25, d: 2.2 }, h: 0.12, color: '#8a8478' },
  { box: { x: PLANE.x + 0.4, z: PLANE.z - 3.0, w: 0.2, d: 0.2 }, h: 0.25, y: 0.9, color: '#e4e8ea', shape: 'cylinder' },
]

// The prologue's camp without its summer things that the winter replaces: Curly's floatplane on the bar.
export const winterCamp: readonly Prop[] = [...campProps.filter((p) => p.while !== 'parked'), ...winter]

// Seconds of play a dig takes with good hands, mitts off on the shovel or the axe in frozen ground: ten game minutes.
export const DIG_TIME = 30
// Reading Owen's second letter, mitts off: five game minutes.
export const READ_TIME = 15
// The reread after a wrong dig (a3_wrong_spot): twenty minutes of light for the line, mitts off.
export const REREAD = 60

// The three places, held to dig. None carries a note: the note is the story's to pick (dug, below).
export const DIG_SPOTS: readonly Interactable[] = [
  { id: 'stove', x: STOVE.x, z: STOVE.z, r: 1.1, prompt: 'Pry up the floorboards behind the stove', hold: DIG_TIME },
  { id: 'cache', x: CACHE.x, z: CACHE.z, r: 1.1, prompt: 'Climb up to the meat cache', hold: DIG_TIME },
  { id: 'marker', x: MARKER.x, z: MARKER.z, r: 1.1, prompt: 'Dig at the survey marker', hold: DIG_TIME },
]

// The ways across the camp clear of the spruce and the tent: from the plane up the bar to the fire ring, and from there
// to each place. The camp's scripted digger (digBot.ts) walks them.
export const HUB = vec(0.5, 4.0)
export const WAYS: Readonly<Record<CacheSpot, readonly Vec[]>> = {
  stove: [vec(STOVE.x, STOVE.z + 0.6)],
  cache: [vec(CACHE.x, CACHE.z - 0.3)],
  marker: [vec(1.0, -4.2), vec(MARKER.x, MARKER.z + 0.3)],
}

export const JAKE = 'jake'
export const JAKE_SPOT: Interactable = { id: JAKE, x: JAKE_AT.x, z: JAKE_AT.z, r: 1.8, prompt: `Back to ${N.jake.split(' ')[0]}` }

// Jake in the look he wears at the hangar (bushStrip.ts), in his winter parka.
export const figures: readonly Figure[] = [
  { id: JAKE, at: JAKE_AT, facing: -Math.PI / 2, height: JAKE_HEIGHT, coat: '#4a4238', skin: '#d8a880', hair: '#8a5a32', hood: true, activity: 'stand' },
]

// The space without its id, which levels.ts gives it, as it does the ski search's slope (skiing.ts).
export const owensCamp: Omit<Space, 'id'> = {
  act: 'Act 3: Deep Winter',
  place: 'surveyCamp',
  name: "Owen's camp in winter",
  interior: false,
  size: { w: 28, d: 24 },
  ground: '#d6dadc',
  spawn: SPAWN,
  props: winterCamp,
  figures,
  spots: [...DIG_SPOTS, JAKE_SPOT],
}

// --- The dig ---------------------------------------------------------------------------------------------------------

const isSpot = (id: string): id is CacheSpot => DIG_SPOTS.some((d) => d.id === id)

// What the run carries to its checkpoints: where Lucy stands and the spots she has dug.
export type Carried = Readonly<{ at: Vec; facing: number; dug: readonly CacheSpot[] }>

export type Dig = Run<Carried>

// The notes the story's menu offers here. The dig plays while it offers a place to dig (the first dig's three) or the dig
// in the right place; once it offers the way home the bundle is found and Jake is waiting.
const offered = (s: State): readonly string[] => menu(s).options.map((o) => o.note)
const FIRST: readonly string[] = ['stove', 'cache', 'marker']
export const DIG_NOTE = 'dig'
export const HOME_NOTE = 'home'
const firstDig = (s: State): boolean => offered(s).some((n) => FIRST.includes(n))
export const digging = (s: State): boolean => firstDig(s) || offered(s).includes(DIG_NOTE)
export const found = (s: State): boolean => offered(s).includes(HOME_NOTE)

// Stepping off the plane: the first checkpoint, the clock the scene's.
export const arrival = (s: State): Dig => begin<Carried>({ at: SPAWN, facing: SPAWN_FACING, dug: [] }, clock(s)!)

// Which spots are open: the three places until the bundle is found, less the ones already dug; then only Jake.
export const campSpot = (s: State, d: Dig | undefined, id: string): boolean =>
  id === JAKE ? found(s) : digging(s) && isSpot(id) && !(d?.carried.dug.includes(id) ?? false)

// A dig takes twice as long with white hands (survival.ts, handTime).
export const digTime = (d: Dig): number => handTime(d.body, DIG_TIME)

// The world on Lucy this moment: the open bar at thirty-eight below, standing still or not, mitts off while she digs or
// reads.
export const exposure = (moving: boolean, mittsOff: boolean): Exposure => ({ open: true, wind: false, still: !moving, mittsOff, wet: false })

// One moment of the dig. Freezing too long or the light gone fades back to the last checkpoint (Rule 4: the story never
// hears of it).
export const step = (d: Dig, e: Exposure, dt: number): Readonly<{ dig: Dig; failed?: Failure }> => {
  const moved: Dig = { ...d, body: expose(d.body, e, dt), played: d.played + dt }
  const f = failure(moved)
  return f ? { dig: retry(moved), failed: f } : { dig: moved }
}

// A spot dug to the bottom. At a3_camp the spot is the scene's note, whatever it holds, and the dig reaches its second
// checkpoint. At a3_wrong_spot the right place sends the scene's `dig`; a wrong one sends nothing and is only dug.
export type Dug = Readonly<{ send?: string; dig: Dig }>

export const dug = (s: State, d: Dig, spot: CacheSpot, at: Vec, facing: number): Dug => {
  const carried: Carried = { at, facing, dug: [...d.carried.dug, spot] }
  if (firstDig(s)) return { send: spot, dig: reach(d, carried) }
  if (cacheIsAt(s, spot)) return { send: DIG_NOTE, dig: { ...d, carried } }
  return { dig: { ...d, carried } }
}

// The reread after a wrong first dig: twenty minutes of light, bare-handed, for the line.
export const reread = (d: Dig): Dig => ({ ...d, body: expose(d.body, exposure(false, true), REREAD), played: d.played + REREAD })

// The read of Owen's second letter, mitts off: the one line in it about where he put things, for the spot he chose.
export const LETTER_TITLE = `${N.owenShort}'s second letter`
export const letterLine = (s: State): string => (s.owenCache ? digLabels[s.owenCache] : '')

// What the fade says before the checkpoint.
export const FAILED: Readonly<Record<Failure, string>> = {
  dark: 'The light is gone.',
  froze: 'Too cold to go on.',
}


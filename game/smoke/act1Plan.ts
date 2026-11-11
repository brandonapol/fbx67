import type { SceneId } from '../../text-game/src/types.ts'
import { menu } from '../../text-game/src/story.ts'
import type { Game } from '../src/prologue.ts'
import { available, focus } from '../src/prologue.ts'
import { sheet } from '../src/letters.ts'
import type { SpaceId } from '../src/levels.ts'
import { spaces } from '../src/levels.ts'
import type { Points } from '../src/trail.ts'
import { LEGS } from '../src/trail.ts'
import type { Interactable, Vec } from '../src/world.ts'

// Act 1 played as the smoke test plays it: from the text build's Act 1 path (every choice the first) to Act 2's first
// scene. nextStep reads the live game and says what a player does next; act1Plan.test.ts proves it headless, and
// act1.test.ts does the same steps in the browser.
export const ACT1_PATH = '1,1,1,1,1,1'

export const ACT2_FIRST: SceneId = 'a2_major'

export type Step =
  | Readonly<{ kind: 'key'; key: string }>
  | Readonly<{ kind: 'walk'; spot: string; points: Points; yaw: number }>
  | Readonly<{ kind: 'interact'; spot: string; hold: boolean }>
  | Readonly<{ kind: 'wait' }>
  // In the barfight: head for this point a moment, without waiting to get there (the fight moves under him).
  // Knocked down, he presses shove to get up: any of the fight's verbs does.
  | Readonly<{ kind: 'steer'; x: number; z: number; getUp: boolean }>

// Where a space offers more than one thing to use, the one that moves the story (the land office's ledgers only
// carry; Lucy asks).
const prefer: Partial<Record<SpaceId, string>> = { office: 'lucy' }

// The yaw that looks from a to b: 0 looks down -z, π/2 east, π down +z (the camera's convention in main.ts).
export const yawTo = (from: Readonly<{ x: number; z: number }>, to: Readonly<{ x: number; z: number }>): number =>
  Math.atan2(to.x - from.x, to.z - from.z)

// The search for Eli wades the flooded town along the streets the townspeople point down (trail.ts, LEGS), as
// trail.test.ts does: the sandbag line and the buildings are in the way of a straight line. Fifth is reached from the
// tent by the porch and the boy on Third; the sergeant from wherever Eli was caught up with.
const legs: Readonly<Record<string, (g: Game) => Points>> = {
  mattress: () => LEGS.toMattress,
  window: () => LEGS.toWindow,
  porch: () => LEGS.toPorch,
  boat: () => LEGS.toBoat,
  tent: () => LEGS.toTent,
  fifth: (g) => (g.pos.z > 130 ? [...LEGS.fromTent, ...LEGS.toBoy, ...LEGS.toFifth] : LEGS.toFifth),
  sergeant: (g) => (g.pos.z > 120 ? LEGS.backFromFifth : LEGS.backFromThird),
}

// Elsewhere the spot is in the open: Wade walks straight at it and stops inside its reach, short of whoever stands on it.
const REACH = 0.8

const approach = (from: Vec, spot: Interactable): Points => {
  const d = Math.hypot(from.x - spot.x, from.z - spot.z)
  const k = d === 0 ? 0 : Math.min(1, (spot.r * REACH) / d)
  return [[spot.x + (from.x - spot.x) * k, spot.z + (from.z - spot.z) * k]]
}

const routeTo = (g: Game, spot: Interactable): Points =>
  g.space === 'line' && legs[spot.id] ? legs[spot.id]!(g) : approach(g.pos, spot)

// The key for the button that takes the story's first choice: the path is all 1s.
// At the barfight's prompt the first choice is a move, so getting up.
const firstChoice = (g: Game, buttons: readonly string[]): Step => {
  const first = menu(g.story).options.find((o) => o.n === 1)?.note
  const at = [first && `note:${first}`, 'fight:gotUp', 'continue', 'close'].map((id) => (id ? buttons.indexOf(id) : -1)).find((i) => i >= 0)
  if (at === undefined) throw new Error(`${g.story.scene}: no button takes choice 1 (${buttons.join(', ')})`)
  return { kind: 'key', key: String(at + 1) }
}

// In the barfight Wade stands with Eli: he steers for Eli's shoulder, the side he is on, and stays there until the law
// comes in. That is the fight's first choice at every one of its menus: shove, clean, stood with Eli.
const SHOULDER = 0.8

const steer = (g: Game): Step => {
  const eli = g.brawl!.fight.fighters.find((x) => x.id === 'eli')!
  const down = g.brawl!.fight.fighters.find((x) => x.id === 'wade')!.stance === 'down'
  const d = Math.hypot(g.pos.x - eli.pos.x, g.pos.z - eli.pos.z)
  const k = d === 0 ? 0 : Math.min(1, SHOULDER / d)
  return { kind: 'steer', x: eli.pos.x + (g.pos.x - eli.pos.x) * k, z: eli.pos.z + (g.pos.z - eli.pos.z) * k, getUp: down }
}

export const nextStep = (g: Game): Step => {
  if (g.brawl) return steer(g)
  if (g.home) return g.home.writing ? { kind: 'wait' } : firstChoice(g, sheet(g.home).buttons.map((b) => `note:${b.note}`))
  if (g.panel) return firstChoice(g, g.panel.buttons.map((b) => b.id))
  // Holding a spot, lying down, swept by the current, or on a ride with nothing to use yet: the game moves on alone.
  const here = available(g)
  const spot = here.find((s) => s.id === prefer[g.space]) ?? here[0]
  if (g.holding || g.sleeping !== undefined || g.swept !== undefined || !spot) return { kind: 'wait' }
  if (focus(g)?.id === spot.id) return { kind: 'interact', spot: spot.id, hold: spot.hold !== undefined }
  // Seated in Eli's boat (the ride poles on to the cabin alone), or in reach but turned away: only look at it.
  const points = g.ride !== undefined || Math.hypot(g.pos.x - spot.x, g.pos.z - spot.z) <= spot.r ? [] : routeTo(g, spot)
  const [x, z] = points.at(-1) ?? [g.pos.x, g.pos.z]
  return { kind: 'walk', spot: spot.id, points, yaw: yawTo({ x, z }, spot) }
}

// A beat is a stretch of the act in one space: its first scene there is where its frame is captured. The scenes with
// no space yet (the bar fight to the whistle, the letter home) open as panels over the space Wade is in, so the run
// never stands in `story`; the prologue's starts sample it. The Act 1 spaces are levels.ts's spaces of that act.
export const act1Spaces: readonly SpaceId[] = Object.values(spaces)
  .filter((s) => s.act === 'Act 1: Flood')
  .map((s) => s.id)

// The moral-weather bands (lighting.ts, bandOf), by the heat that puts the story in each, as the skiff and knot poses do.
export const bands = [
  { suffix: '', heat: 0 },
  { suffix: '_dusk', heat: 2 },
  { suffix: '_night', heat: 4 },
] as const

// The probe pose each Act 1 space's frame is taken from (src/probe.ts).
export const poseFor: Readonly<Partial<Record<SpaceId, string>>> = {
  line: 'line',
  helpTent: 'tent',
  cabin: 'cabin',
  office: 'office',
  pan: 'pan',
  jail: 'cell',
}

// The barfight mid-fight (#177): at the Pan's beat, besides the Pan before the shove, the run captures the fight at its
// peak (all ten men in it, src/probe.ts) in each band, and samples it held still against its own row in docs/perf.md.
export const PEAK = { scene: 'a1_barfight', frame: 'a1_brawl', pose: 'brawl', moment: 'panPeak' } as const

// What the run must sample: every Act 1 space, and the peak.
export const act1Played: readonly string[] = [...act1Spaces, PEAK.moment]

// A tap of interact acts on the keydown, on whatever is in focus then (main.ts), not on what the plan read a moment
// before: the camera can have turned since (a beat's capture can leave it placed for its pose). So the smoke run
// presses only while the live game still offers the step's spot, and presses again, when a press changed nothing, only
// while it still does; otherwise the plan reads the game afresh (an aim puts the spot back in view).
export const offers = (s: Step, now: Game): boolean => {
  const next = nextStep(now)
  return s.kind === 'interact' && next.kind === 'interact' && next.spot === s.spot && next.hold === s.hold
}

export const isBeat = (before: Game | undefined, now: Game): boolean => before === undefined || before.space !== now.space

export const label = (s: Step): string =>
  s.kind === 'steer' ? `steer to ${s.x.toFixed(1)},${s.z.toFixed(1)}` : s.kind === 'key' ? `key ${s.key}` : s.kind === 'walk' ? `walk to ${s.spot}` : s.kind === 'interact' ? `${s.hold ? 'hold' : 'use'} ${s.spot}` : 'wait'

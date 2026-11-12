import type { Clock, State } from '../../text-game/src/types.ts'
import { clock, menu, mission, send } from '../../text-game/src/story.ts'
import type { Body, Exposure, Failure, Fire, Run, Step } from './survival.ts'
import {
  BOUGHS,
  DEADFALL,
  LIGHTING,
  begin,
  burning,
  eat,
  feed,
  handTime,
  kindle,
  pace,
  reach,
  retry,
  sheltered,
  stepOf,
  tick,
} from './survival.ts'

// The long night played in the engine (docs/acts/act3-missions.md, section 2; issue #138): the survival rules of
// survival.ts run frame by frame over the night's tasks. Lucy cuts boughs and deadfall, lights and feeds the fire,
// works Jake free, ties off the bleeding and beds him by the fire, then makes her signal and keeps the fire through
// the night. The order and the signal are the player's two deliberate prompts; how well the night is played (warmth,
// wet clothes, white fingers, numb feet) stays inside the mission. At first light the mission's one note goes, the
// story's own `order.signal` (missions.ts, theLongNight), and nothing else: a failure is a fade and a retry from the
// last checkpoint (story-api.md, Rule 4).
//
// Nothing here re-implements a survival rule: warmth, the fire, hands and feet, checkpoints and failure are survival.ts.
// What this module adds is the play: where Lucy is, what she is doing and how long it takes, the sweat that makes her
// wet, the order the tasks may go in, and what the player sees. Every number below is this module's own tuning.

export const MISSION = 'theLongNight'

export type Order = 'fire' | 'jake'
export type Signal = 'smoke' | 'stampX' | 'saveFire'

// Where Lucy can be: in the tipped cabin with Jake, at the fire in the lee of the fuselage, in the spruce cutting,
// or out on the open slope.
export type Place = 'cabin' | 'fire' | 'trees' | 'slope'
export const PLACES: readonly Place[] = ['fire', 'cabin', 'trees', 'slope']

// What the mission carries through a checkpoint (survival.ts, Run): the choices, where Lucy is, the wood at hand,
// what is done for Jake and the signal, her sweat, and how far into the night she is.
export type Camp = Readonly<{
  order: Order
  signal?: Signal
  at: Place
  boughs: number
  deadfall: number
  lit: boolean
  free: boolean
  tied: boolean
  bedded: boolean
  signalled: boolean
  sweat: number
  night: number
}>

export type Verb =
  | 'cut:boughs'
  | 'cut:deadfall'
  | 'light'
  | 'feed'
  | 'free'
  | 'tie'
  | 'bed'
  | 'eat'
  | 'rags'
  | 'stamp'
  | `go:${Place}`

// A task under way: the verb and the play seconds left of it.
export type Doing = Readonly<{ verb: Verb; left: number; total: number }>

// Why the night faded: the cold (survival.ts), or the fire out with Lucy away from it.
export type Out = Failure | 'fireOut'

export type Night = Readonly<{ run: Run<Camp>; doing?: Doing; out?: Out }>

// --- Tuning ----------------------------------------------------------------------------------------------------------

// Assumed: the play seconds each task takes with good hands (survival.ts handTime doubles the hand tasks with white
// ones); lighting is survival.ts's own LIGHTING.
export const SECONDS = {
  'cut:boughs': 10,
  'cut:deadfall': 25,
  feed: 3,
  free: 30,
  tie: 20,
  bed: 20,
  eat: 5,
  rags: 15,
  stamp: 40,
} as const

// Assumed: a walk between any two places; numb feet stretch it (survival.ts pace).
export const WALK = 8

// The tasks done bare-handed (mitts off): lighting, the frame, the knot, the rags.
const BARE: ReadonlySet<Verb> = new Set(['light', 'free', 'tie', 'rags'])

// The hard work that makes her sweat: the axe, carrying Jake, stamping the X.
const HARD: ReadonlySet<Verb> = new Set(['cut:boughs', 'cut:deadfall', 'bed', 'stamp'])

// Assumed: a minute of hard work soaks her through; half that and she is wet (survival.ts's wet). Only a fire dries
// her, in half a minute: at thirty below, sweat away from a fire freezes in the clothes.
export const SWEAT_IN = 60
export const WET = 0.5
export const DRY = 30

// Assumed: the night is played as tasks for two minutes of play once the signal is made, then first light.
export const NIGHT = 120

// Assumed: Lucy at the fire stands a meter from it.
const AT_FIRE = 1

// Where each task is done; eating and walking go anywhere.
const PLACE_OF: Readonly<Partial<Record<Verb, Place>>> = {
  'cut:boughs': 'trees',
  'cut:deadfall': 'trees',
  light: 'fire',
  feed: 'fire',
  free: 'cabin',
  tie: 'cabin',
  bed: 'cabin',
  rags: 'cabin',
  stamp: 'slope',
}

// --- The night's stages ----------------------------------------------------------------------------------------------

export type Stage = 'work' | 'signal' | 'signalling' | 'night' | 'dawn'

const worked = (c: Camp): boolean => c.lit && c.free && c.tied && c.bedded

export const stageOf = (c: Camp): Stage =>
  !worked(c) ? 'work' : c.signal === undefined ? 'signal' : !c.signalled ? 'signalling' : c.night < NIGHT ? 'night' : 'dawn'

const wood = (c: Camp): number => c.boughs + c.deadfall

// The order's gate: fire first, Jake waits until the fire is lit; Jake first, the axe and the matches wait until he is
// free and the bleeding tied off. Both happen either way.
const jakeWaits = (c: Camp): boolean => c.order === 'fire' && !c.lit
const fireWaits = (c: Camp): boolean => c.order === 'jake' && !c.tied

// Whether a verb can be done now, wherever Lucy is (walking there is the player's).
export const ready = (n: Night, v: Verb): boolean => {
  const c = n.run.carried
  const fire = n.run.fire
  const lit = fire !== undefined && burning(fire)
  const stage = stageOf(c)
  if (stage === 'dawn') return false
  if (v.startsWith('go:')) return c.at !== v.slice(3)
  switch (v) {
    case 'cut:boughs':
    case 'cut:deadfall':
      return !fireWaits(c)
    case 'light':
      return !lit && wood(c) > 0 && !fireWaits(c)
    case 'feed':
      return lit && wood(c) > 0
    case 'free':
      return !c.free && !jakeWaits(c)
    case 'tie':
      return c.free && !c.tied
    case 'bed':
      return c.tied && c.lit && c.boughs > 0 && !c.bedded
    case 'eat':
      return n.run.body.fed <= 0
    case 'rags':
      return stage === 'signalling' && c.signal === 'smoke'
    case 'stamp':
      return stage === 'signalling' && c.signal === 'stampX'
  }
  return false
}

// The verbs open to the player here and now: the tasks at this place, then the walks.
export const verbs = (n: Night): readonly Verb[] => {
  const c = n.run.carried
  const here = (Object.keys(PLACE_OF) as Verb[]).filter((v) => PLACE_OF[v] === c.at)
  const walks = PLACES.map((p): Verb => `go:${p}`)
  return [...here, 'eat' as const, ...walks].filter((v) => ready(n, v))
}

// --- Starting, stepping, finishing -----------------------------------------------------------------------------------

export const ORDERS: readonly Order[] = ['fire', 'jake']
export const SIGNALS: readonly Signal[] = ['smoke', 'stampX', 'saveFire']

const isOrder = (s: string): s is Order => (ORDERS as readonly string[]).includes(s)
const isSignal = (s: string): s is Signal => (SIGNALS as readonly string[]).includes(s)

// Whether the story is at the night's start, its order prompt the story's own menu (a3_crash).
export const starts = (s: State): boolean => mission(s)?.id === MISSION

// Lucy comes to in the cabin and the player has picked the order: the first checkpoint. Nothing is sent yet.
export const begins = (s: State, note: string): Night | undefined => {
  if (!starts(s) || !isOrder(note)) return undefined
  const camp: Camp = { order: note, at: 'cabin', boughs: 0, deadfall: 0, lit: false, free: false, tied: false, bedded: false, signalled: false, sweat: 0, night: 0 }
  return { run: begin(camp, (clock(s) ?? '1967-12-12T14:15') as Clock) }
}

// What the night does to Lucy this moment (survival.ts's exposure): the slope is open and windy, the rest sheltered;
// standing idle is standing still; the bare-handed tasks are mitts off; wet once her sweat is through; at the fire,
// its distance (survival.ts's tick warms only while it burns).
export const exposureOf = (n: Night): Exposure => {
  const c = n.run.carried
  const v = n.doing?.verb
  const slope = c.at === 'slope'
  return {
    ...sheltered,
    open: slope,
    wind: slope,
    still: v === undefined,
    mittsOff: v !== undefined && BARE.has(v),
    wet: c.sweat >= WET,
    ...(c.at === 'fire' ? { fire: AT_FIRE } : {}),
  }
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

const warming = (c: Camp, fire: Fire | undefined): boolean => c.at === 'fire' && fire !== undefined && burning(fire)

// Hard work soaks her; only a burning fire dries her.
export const sweatAfter = (c: Camp, fire: Fire | undefined, verb: Verb | undefined, dt: number): number =>
  clamp01(c.sweat + (verb !== undefined && HARD.has(verb) ? dt / SWEAT_IN : 0) - (warming(c, fire) ? dt / DRY : 0))

// How long a verb takes this body: hand tasks fumble with white hands, walks drag on numb feet (survival.ts).
export const secondsFor = (b: Body, v: Verb): number =>
  v.startsWith('go:') ? WALK / pace(b) : v === 'light' ? handTime(b, LIGHTING) : v === 'eat' ? SECONDS.eat : handTime(b, SECONDS[v as keyof typeof SECONDS])

// The player picks a verb: it starts, if it can. A task under way or a fade takes no new one.
export const act = (n: Night, v: Verb): Night =>
  n.doing || n.out || !verbs(n).includes(v) ? n : { ...n, doing: { verb: v, left: secondsFor(n.run.body, v), total: secondsFor(n.run.body, v) } }

// The signal prompt: the player's pick, deliberate and without a timer. Saving it all for the fire has no task.
export const choose = (n: Night, signal: string): Night => {
  const c = n.run.carried
  if (n.out || stageOf(c) !== 'signal' || !isSignal(signal)) return n
  return { ...n, run: { ...n.run, carried: { ...c, signal, signalled: signal === 'saveFire' } } }
}

// A task's end: what it changes in the camp and the body.
const finish = (r: Run<Camp>, v: Verb): Run<Camp> => {
  const c = r.carried
  if (v.startsWith('go:')) return { ...r, carried: { ...c, at: v.slice(3) as Place } }
  switch (v) {
    case 'cut:boughs':
      return { ...r, carried: { ...c, boughs: c.boughs + 1 } }
    case 'cut:deadfall':
      return { ...r, carried: { ...c, deadfall: c.deadfall + 1 } }
    case 'light':
    case 'feed': {
      // The heavier wood first: deadfall burns three times as long, and the boughs are wanted for Jake's bed.
      const log = c.deadfall > 0
      const load = log ? DEADFALL : BOUGHS
      const carried = { ...c, lit: true, deadfall: c.deadfall - (log ? 1 : 0), boughs: c.boughs - (log ? 0 : 1) }
      if (v === 'feed') return { ...r, carried, fire: feed(r.fire ?? { fuel: 0 }, load) }
      const k = kindle(r.body, load)
      return { ...r, carried, body: k.body, fire: k.fire }
    }
    case 'free':
      return { ...r, carried: { ...c, free: true } }
    case 'tie':
      return { ...r, carried: { ...c, tied: true } }
    case 'bed':
      // Jake on boughs by the fire, the sleeping bag over him: she ends at the fire with him.
      return { ...r, carried: { ...c, bedded: true, boughs: c.boughs - 1, at: 'fire' } }
    case 'eat':
      return { ...r, body: eat(r.body) }
    case 'rags':
    case 'stamp':
      return { ...r, carried: { ...c, signalled: true } }
  }
  return r
}

// One frame of the night: the task runs, the clock and the cold run (survival.ts tick; the night is played as tasks,
// so the sky never fails it), she sweats or dries, and the night counts on once the signal is made. Finishing the
// order's work is the second checkpoint. Freezing too long, or the fire out with Lucy away from it, fades back to the
// last checkpoint.
export const step = (n: Night, dt: number): Night => {
  if (n.out || stageOf(n.run.carried) === 'dawn') return n
  const before = n.run
  const verb = n.doing?.verb
  const ticked = tick(before, exposureOf(n), dt, false)
  if (ticked.played < before.played + dt - 1e-9) return { run: ticked, out: 'froze' }
  const c = before.carried
  const carried: Camp = { ...c, sweat: sweatAfter(c, before.fire, verb, dt), night: stageOf(c) === 'night' ? c.night + dt : c.night }
  const left = (n.doing?.left ?? 0) - dt
  const doneNow = n.doing !== undefined && left <= 0
  const ran: Run<Camp> = doneNow ? finish({ ...ticked, carried }, verb!) : { ...ticked, carried }
  const run = !worked(c) && worked(ran.carried) ? reach(ran) : ran
  const doing = n.doing && !doneNow ? { ...n.doing, left } : undefined
  const fireOut = run.carried.lit && run.fire !== undefined && !burning(run.fire) && run.carried.at !== 'fire'
  return fireOut ? { run: retry(run), out: 'fireOut' } : { run, doing }
}

// After the fade: back to the last checkpoint. From the first, that is before the order prompt (the story's own
// menu), so the night is gone and the game shows the prompt again.
export const again = (n: Night): Night | undefined => (n.run.checkpoint.played === 0 ? undefined : { run: n.run, doing: undefined })

export const dawned = (n: Night): boolean => stageOf(n.run.carried) === 'dawn'

// The mission's one note: the story's own `order.signal` (missions.ts, theLongNight).
export const noteOf = (n: Night): string => `${n.run.carried.order}.${n.run.carried.signal}`

// The scene notes the mission's ending applies, in play order: the story's data, not this file's.
export const sceneNotes = (s: State, note: string): readonly string[] => {
  const m = mission(s)
  const e = m?.id === MISSION ? m.endings.find((x) => x.note === note) : undefined
  if (!e) throw new Error(`${s.scene} has no long-night ending ${note}`)
  return e.applies
}

// --- What the player sees --------------------------------------------------------------------------------------------

export type Button = Readonly<{ id: string; label: string }>

export type NightPanel = Readonly<{ title: string; text: string; buttons: readonly Button[] }>

const PLACE_NAMES: Readonly<Record<Place, string>> = {
  cabin: 'the cabin',
  fire: 'the fire',
  trees: 'the spruce',
  slope: 'the open slope',
}

const LABELS: Readonly<Record<Exclude<Verb, `go:${Place}`>, string>> = {
  'cut:boughs': 'Cut spruce boughs',
  'cut:deadfall': 'Cut deadfall',
  light: 'Light the fire',
  feed: 'Feed the fire',
  free: 'Work the frame off Jake’s leg',
  tie: 'Tie off the bleeding',
  bed: 'Carry Jake to the fire, boughs under him, the bag over him',
  eat: 'Eat from the kit',
  rags: 'Soak rags in a cowling panel for the smoke',
  stamp: 'Stamp the X',
}

export const labelOf = (v: Verb): string => (v.startsWith('go:') ? `Go to ${PLACE_NAMES[v.slice(3) as Place]}` : LABELS[v as keyof typeof LABELS])

const DOING: Readonly<Record<Exclude<Verb, `go:${Place}`>, string>> = {
  'cut:boughs': 'Cutting boughs',
  'cut:deadfall': 'Cutting deadfall',
  light: 'Striking matches',
  feed: 'Feeding the fire',
  free: 'Working the frame',
  tie: 'Tying off',
  bed: 'Carrying Jake',
  eat: 'Eating',
  rags: 'Soaking rags',
  stamp: 'Stamping',
}

const doingText = (d: Doing): string => {
  const what = d.verb.startsWith('go:') ? `Walking to ${PLACE_NAMES[d.verb.slice(3) as Place]}` : DOING[d.verb as keyof typeof DOING]
  return `${what}… ${Math.ceil(Math.max(0, d.left))} s`
}

// --- The cold you can see (issue #185) ---

// The accessibility options the cold effects follow: reduced motion (frontEnd.ts, reduced) and high contrast.
export type Access = Readonly<{ reduced: boolean; contrast: boolean }>

export const noAccess: Access = { reduced: false, contrast: false }

// What the body looks like, for the view to draw: breath (how thick its fog, and whether it puffs), the fingers
// (pale once halfway to white), the walk's pace, frost at the screen's edge and a shiver. Reduced motion holds the
// breath still and stops the shiver; high contrast drops the pale frost haze, which washes the frame out, for the
// state in words.
export type Tells = Readonly<{
  breath: number
  puffs: boolean
  fingers: 'fine' | 'pale' | 'white'
  walk: number
  frost: number
  shiver: number
  words?: string
}>

const BREATH: Readonly<Record<Step, number>> = { warm: 0.3, chilled: 0.5, cold: 0.75, freezing: 1 }
const FROST: Readonly<Record<Step, number>> = { warm: 0, chilled: 0.15, cold: 0.35, freezing: 0.6 }
const SHIVER: Readonly<Record<Step, number>> = { warm: 0, chilled: 0, cold: 0.004, freezing: 0.01 }

// Assumed: fingers show pale halfway to white (survival.ts BARE_LIMIT is 45 s).
const PALE = 22.5

const FEEL: Readonly<Record<Step, string>> = {
  warm: 'Warm.',
  chilled: 'Your breath hangs in front of you.',
  cold: 'You are shivering hard.',
  freezing: 'You can’t stop shaking. Get to the fire.',
}

// The body in words, the readout the panel and high contrast both use.
export const feel = (b: Body, wet: boolean): string =>
  [
    FEEL[stepOf(b.warmth)],
    b.hands === 'white' ? 'Your fingers are white and won’t close.' : '',
    b.feet === 'numb' ? 'You can’t feel your feet.' : '',
    wet ? 'Your sweat is freezing in your clothes.' : '',
  ]
    .filter(Boolean)
    .join(' ')

export const tells = (b: Body, wet: boolean, a: Access = noAccess): Tells => {
  const s = stepOf(b.warmth)
  return {
    breath: BREATH[s],
    puffs: !a.reduced,
    fingers: b.hands === 'white' ? 'white' : b.bare >= PALE ? 'pale' : 'fine',
    walk: pace(b),
    frost: a.contrast ? 0 : FROST[s],
    shiver: a.reduced ? 0 : SHIVER[s],
    ...(a.contrast ? { words: feel(b, wet) } : {}),
  }
}

const fireText = (n: Night): string => {
  const f = n.run.fire
  if (!n.run.carried.lit || f === undefined) return 'No fire yet.'
  if (!burning(f)) return 'The fire is out.'
  return f.fuel < 60 ? 'The fire is burning low.' : 'The fire is going.'
}

const OUT_TEXT: Readonly<Record<Out, string>> = {
  froze: 'The cold closes over everything.',
  dark: 'The light is gone.',
  fireOut: 'The fire went out while you were away from it.',
}

// The signal prompt's labels are the story's own: the menu the order leads to (a3_survive_*).
const signalButtons = (s: State, n: Night): readonly Button[] => {
  const options = menu(send(s, n.run.carried.order)).options
  return SIGNALS.map((sig) => ({ id: `night:signal:${sig}`, label: options.find((o) => o.note === sig)?.label ?? sig }))
}

// The night's panel: the title is the mission's, the text what Lucy feels, the fire, the wood at hand and the task
// under way; the buttons the verbs open now, or the signal prompt, or the retry after a fade.
export const panelOf = (s: State, n: Night): NightPanel => {
  const title = mission(s)?.title ?? 'The long night'
  if (n.out) return { title, text: OUT_TEXT[n.out], buttons: [{ id: 'night:retry', label: 'Try again' }] }
  const c = n.run.carried
  const stage = stageOf(c)
  const where = `At ${PLACE_NAMES[c.at]}. ${fireText(n)} Boughs: ${c.boughs}. Deadfall: ${c.deadfall}.`
  const text = [feel(n.run.body, c.sweat >= WET), where, n.doing ? doingText(n.doing) : stage === 'night' ? 'Keep the fire through the night.' : '']
    .filter(Boolean)
    .join('\n\n')
  if (n.doing) return { title, text, buttons: [] }
  const tasks = verbs(n).map((v) => ({ id: `night:${v}`, label: labelOf(v) }))
  // The signal prompt has no timer, but the fire burns while she decides: the tasks stay open under the signals.
  return { title, text, buttons: stage === 'signal' ? [...signalButtons(s, n), ...tasks] : tasks }
}

// A night button pressed: the verb, the signal, or the retry. `undefined` is the night given up for the prompt again.
export const press = (n: Night, id: string): Night | undefined => {
  if (!id.startsWith('night:')) return n
  const rest = id.slice(6)
  if (rest === 'retry') return n.out ? again(n) : n
  if (rest.startsWith('signal:')) return choose(n, rest.slice(7))
  return act(n, rest as Verb)
}

// --- A player for the headless run (smoke/act3Plan.ts) ---------------------------------------------------------------

// A banked fire: enough to stamp the X and come back with fuel to spare.
const BANKED = 2 * BOUGHS

// What a steady player wants next, by the stage: keep the fire, do the order's work in its order, stock wood and bank
// the fire, make the signal, then wait at the fire. `undefined` waits.
const want = (n: Night, signal: Signal): Verb | `signal:${Signal}` | 'retry' | undefined => {
  if (n.out) return 'retry'
  const c = n.run.carried
  const fire = n.run.fire
  const stage = stageOf(c)
  if (stage === 'dawn') return undefined
  if (n.run.body.fed <= 0 && n.run.body.warmth <= 2.5) return 'eat'
  if (c.lit && fire !== undefined && burning(fire) && fire.fuel < 90 && wood(c) > 0) return 'feed'
  if (c.lit && fire !== undefined && !burning(fire) && wood(c) > 0) return 'light'
  if (stage === 'work') {
    const fuel: Verb | undefined = c.deadfall < 1 ? 'cut:deadfall' : c.boughs < 1 ? 'cut:boughs' : undefined
    const fireWork: readonly (Verb | undefined)[] = [c.lit ? undefined : fuel, c.lit ? undefined : 'light']
    const jakeWork: readonly (Verb | undefined)[] = [c.free ? undefined : 'free', c.tied ? undefined : 'tie']
    const bedWork: readonly (Verb | undefined)[] = [c.boughs < 1 ? 'cut:boughs' : undefined, 'bed']
    const steps = [...(c.order === 'fire' ? [...fireWork, ...jakeWork] : [...jakeWork, ...fireWork]), ...bedWork]
    return steps.find((v) => v !== undefined)
  }
  // After the work: wood at hand and the fire banked before anything takes her away from it.
  if (wood(c) < 2) return 'cut:deadfall'
  if (fire !== undefined && fire.fuel < BANKED) return 'feed'
  if (stage === 'signal') return `signal:${signal}`
  if (stage === 'signalling') return c.signal === 'smoke' ? 'rags' : 'stamp'
  return c.at === 'fire' ? undefined : 'go:fire'
}

// The button a steady player presses next on the night's panel, or `undefined` to let the night run. The smoke run
// takes the first signal, as it takes every first choice.
export const nextPress = (n: Night, signal: Signal = SIGNALS[0]!): string | undefined => {
  if (n.doing) return undefined
  const w = want(n, signal)
  if (w === undefined) return undefined
  if (w === 'retry' || w.startsWith('signal:')) return `night:${w}`
  const v = w as Verb
  const there = PLACE_OF[v]
  const go: Verb | undefined = there !== undefined && there !== n.run.carried.at ? `go:${there}` : undefined
  const pick = go ?? v
  return ready(n, pick) ? `night:${pick}` : undefined
}

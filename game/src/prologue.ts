import type { CacheSpot, State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu, place, send } from '../../text-game/src/story.ts'
import { prologueThreads, prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import { say, within } from '../../text-game/src/ambient/select.ts'
import { route } from './router.ts'
import type { Interactable, Vec } from './world.ts'
import { add, angleBetween, angleTo, distance, length, move, normalize, pick, scale, sees, sub, vec } from './world.ts'
import type { Mark, SpaceId } from './levels.ts'
import { CURLY_AT, CURLY_HALF_ANGLE, CURLY_RANGE, STAIR_FOOT, curlyFacing, flooded, occluders, solids, spaces, standAt } from './levels.ts'
import { doors, legs, spawnAt, yawOf } from './downtown.ts'
import { jailSpot, letOut } from './jail.ts'
import { tentSpot } from './hospital.ts'
import { officeSpot, takesIt } from './landoffice.ts'
import type { Letter as Home } from './letters.ts'
import { choose, finish as penDown, open as openHome, turn as turnPage, write, written } from './letters.ts'
import { FLOOD_AT, FLOOD_FACING } from './highwater.ts'
import { DECK_Y, rideAt, rideOver, riding } from './skiff.ts'

import type { Body, Motion } from './cast.ts'
import { INDOOR_PACE, JOG_SPEED, WALK_SPEED } from './cast.ts'
import { bodyFor } from './pov.ts'

export { HIDE_TIME, ROUND_TIME } from './levels.ts'

export const WALK = WALK_SPEED
export const JOG = JOG_SPEED
export { INDOOR_PACE }
export const ACCEL = 9
export const INDOOR_ACCEL = 5
export const DECEL = 12
export const TURN_RATE = 10
export const TURN_GO = 0.5

export type Button = Readonly<{ id: string; label: string }>

export type Panel = Readonly<{ kind: 'story' | 'talk' | 'letter' | 'home' | 'busted' | 'end' | 'error' | 'locked'; title: string; text: string; buttons: readonly Button[] }>

export type Holding = Readonly<{ id: string; note?: string; progress: number; time: number }>

export type Game = Readonly<{
  story: State
  path: readonly number[]
  space: SpaceId
  pos: Vec
  facing: number
  view: number
  vel: Vec
  t: number
  panel?: Panel
  holding?: Holding
  hidden?: CacheSpot
  busts: number
  handoff?: true
  // The letter at the desk: characters typed so far while its panel is open, and folded once it is by the door.
  typed?: number
  letter?: 'folded'
  // A letter home (letters.ts) while one is open: the view draws it, and its lines are the only choices.
  home?: Home
  // Seconds into the skiff ride, from the moment Owen climbs in (skiff.ts).
  ride?: number
  // What Wade has in his hands: a lit cigarette, a ledger. Lucy dropped the last cigarette in the water.
  lit?: true
  carrying?: 'ledger'
  doused?: true
}>

export type Input = Readonly<{ dir: Vec; hold: boolean; run?: boolean; limit?: number; view?: number }>

const zero = vec(0, 0)

export const still: Input = { dir: zero, hold: false }

const spotIds: readonly CacheSpot[] = ['stove', 'cache', 'marker']

const isSpot = (id: string): id is CacheSpot => (spotIds as readonly string[]).includes(id)

const noteButton = (note: string, label: string): Button => ({ id: `note:${note}`, label })

const storyPanel = (story: State, notes: readonly string[], extra: readonly Button[] = []): Panel => {
  const m = menu(story)
  return {
    kind: 'story',
    title: m.title,
    text: m.text,
    buttons: [...m.options.filter((o) => notes.includes(o.note)).map((o) => noteButton(o.note, o.label)), ...extra],
  }
}

const allNotes = (story: State): readonly string[] => menu(story).options.map((o) => o.note)

const close = (label: string): Button => ({ id: 'close', label })

const restart: Button = { id: 'restart', label: 'Start from the beginning' }

export const sendNote = (g: Game, note: string): Game => {
  const option = menu(g.story).options.find((o) => o.note === note)
  if (!option) throw new Error(`${g.story.scene} does not accept ${note}`)
  return { ...g, story: send(g.story, note), path: [...g.path, option.n] }
}

const enter = (g: Game, space: SpaceId, pos: Vec = spaces[space].spawn, facing: number = Math.PI): Game => ({
  ...g,
  space,
  pos,
  facing,
  view: facing,
  vel: zero,
  t: 0,
  panel: undefined,
  holding: undefined,
  typed: undefined,
  letter: undefined,
  home: undefined,
  ride: undefined,
  lit: undefined,
  carrying: undefined,
  doused: undefined,
})

export const start = (): Game => ({
  story: initialState,
  path: [],
  space: 'bar',
  pos: spaces.bar.spawn,
  facing: Math.PI,
  view: Math.PI,
  vel: zero,
  t: 0,
  busts: 0,
  panel: storyPanel(initialState, [], [close('Walk over to the table.')]),
})

const backdrop = (story: State, path: readonly number[]): Game => ({
  story,
  path,
  space: 'story',
  pos: spaces.story.spawn,
  facing: Math.PI,
  view: Math.PI,
  vel: zero,
  t: 0,
  busts: 0,
})

export const failed = (text: string): Game => ({
  ...backdrop(initialState, []),
  panel: { kind: 'error', title: "Can't start there", text, buttons: [restart] },
})

// A door downtown opens when the story is at the place behind it.
const doorOpen = (g: Game, id: string): boolean => doors.some((d) => d.id === id && d.place === place(g.story))

// The story's menu has this note: a spot that sends it is live, by what the story offers rather than a scene id.
const offers = (g: Game, note: string): boolean => menu(g.story).options.some((o) => o.note === note)

const talked = (g: Game): boolean => g.story.scene.startsWith('p_talk_')

export const available = (g: Game): readonly Interactable[] =>
  spaces[g.space].spots.filter((i) => {
    if (g.space === 'bar') return i.id === 'door' ? talked(g) : i.id === 'hank' ? g.story.scene === 'p_bar' : true
    if (g.space === 'camp') return i.id === 'plane' ? g.hidden !== undefined : g.hidden === undefined
    if (g.space === 'flood') return g.story.scene === 'p_end'
    if (g.space === 'downtown') return doorOpen(g, i.id) || doors.some((d) => d.id === i.id && d.locked)
    if (g.space === 'line') return offers(g, 'findEli')
    if (g.space === 'jail') return jailSpot(g.story, i.id)
    if (g.space === 'helpTent') return tentSpot(g.story, i.id)
    // In August the house is flooded: the only way is down the stair and out the front door.
    if (g.space === 'room') return flooded(g.story) ? i.id === 'downstairs' : i.id === 'bed' ? g.letter === 'folded' : i.id !== 'downstairs' && g.letter === undefined
    if (g.space === 'boarding') return (i.id === 'front') === flooded(g.story)
    if (g.space === 'office') return officeSpot(g.carrying === 'ledger', i.id)
    return true
  })

export const focus = (g: Game): Interactable | undefined => (g.panel ? undefined : pick(g.pos, g.view, g.facing, available(g)))

export const label = (g: Game, i: Interactable): string =>
  (i.note ? menu(g.story).options.find((o) => o.note === i.note)?.label : i.prompt) ?? i.id

export const watcher = (g: Game) => ({ at: CURLY_AT, facing: curlyFacing(g.t), range: CURLY_RANGE, halfAngle: CURLY_HALF_ANGLE })

export const seen = (g: Game): boolean => g.space === 'camp' && sees(watcher(g), g.pos, occluders(spaces.camp))

const leftPrologue = (from: State, to: State): boolean => menu(from).act === 'Prologue' && menu(to).act !== 'Prologue'

// The walk between two rooms: the story has moved to a place downtown reaches on foot from the space Owen is in.
const walkFrom = (g: Game): Game | undefined => {
  const leg = legs.find((l) => l.from === g.space && l.place === place(g.story))
  if (!leg) return undefined
  const s = spawnAt(leg.spawn)
  return enter(g, 'downtown', vec(s.x, s.z), yawOf(s.facing))
}

const locked = (title: string): Panel => ({ kind: 'locked', title, text: 'The door is locked.', buttons: [close('Step back.')] })

// A letter home has no buttons of its own: the letter view offers its lines, so no key can pick one by default.
const homePanel = (l: Home): Panel => ({ kind: 'home', title: l.title, text: l.said, buttons: [] })

// The scene's whole menu: through the letter view where the story is writing home, else as its story panel.
const menuPanel = (g: Game, extra: readonly Button[] = []): Game => {
  const l = openHome(g.story)
  return l ? { ...g, home: l, panel: homePanel(l) } : { ...g, panel: storyPanel(g.story, allNotes(g.story), extra) }
}

// The pen moves on the picked line; once it is written the letter turns to the next topic or is done.
const pen = (g: Game, l: Home, dt: number): Game => {
  const at = write(l, dt)
  if (!written(at)) return { ...g, home: at }
  const next = turnPage(at, g.story)
  return next ? { ...g, home: next, panel: homePanel(next) } : arrive({ ...g, home: undefined, panel: undefined })
}

const arrive = (g: Game): Game => {
  const walking = walkFrom(g)
  if (walking) return walking
  const r = route(g.story, g.space)
  if (r.to === 'text') return { ...g, panel: undefined, holding: undefined, handoff: true }
  if (r.to === 'menu') return menuPanel(g, allNotes(g.story).length ? [] : [restart])
  // The flood is reached through the house: from anywhere else Owen starts in his room, rain on the window, and comes
  // out of the front door onto his porch.
  if (r.space === 'flood' && g.space !== 'flood') return g.space === 'boarding' ? enter(g, 'flood', FLOOD_AT, FLOOD_FACING) : enter(g, 'room')
  if (r.space !== g.space) {
    // Back in a space with nothing to walk to (the line, after the errand at the tent), the scene plays as its menu.
    const into = enter(g, r.space)
    return available(into).length ? into : menuPanel(into)
  }
  const out = letOut(g.story, g.pos)
  if (r.space === 'jail' && out) return enter(g, 'jail', out.at, out.facing)
  // On the laugh path Joan's line waits for Wade at the flap, on his way out.
  if (r.space === 'helpTent' && !tentSpot(g.story, 'joan')) return { ...g, panel: undefined }
  const back = spaces[r.space].back
  if (back) return { ...g, panel: storyPanel(g.story, [], [close(back)]) }
  return menuPanel(g)
}

export const resume = (story: State, path: readonly number[]): Game => (path.length ? arrive(backdrop(story, path)) : start())

// Smoking is a held action anywhere Wade is in the world: hold interact with nothing in front of him to light one.
export const CIGARETTE = 'cigarette'
export const LIGHT_TIME = 1.5

export const canLight = (g: Game): boolean => !g.panel && !g.holding && !g.lit && pov(g.story) === 'wade' && inWorld(g) && !focus(g)

// Lucy takes a lit cigarette out of Wade's mouth as soon as he is near her, and drops it in the water.
const douse = (g: Game): Game => (g.space === 'office' && g.lit && takesIt(g.pos) ? { ...g, lit: undefined, doused: true } : g)

const busted = (g: Game): Game => ({
  ...g,
  holding: undefined,
  busts: g.busts + 1,
  panel: { kind: 'busted', title: 'Busted', text: 'Curly turns around. That was way too obvious.', buttons: [{ id: 'retry', label: 'Try again' }] },
})

const endCard: Panel = {
  kind: 'end',
  title: 'End of the prologue',
  text: 'Act 1 begins. From here you play Wade.',
  buttons: [{ id: 'continue', label: 'Continue as Wade' }],
}

// The landlady, from the prologue town's ambient data: her greeting for this hour, and on the night a man came asking
// which room was Owen's, that exchange with the boarder, word for word.
const townsperson = (id: string) => {
  const p = prologueTown.find((a) => a.id === id)
  if (!p) throw new Error(`no townsperson ${id}`)
  return p
}

const capital = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)

export const landladyPanel = (story: State): Panel => {
  const her = townsperson('landlady')
  const greet = say(story, her, 'greet', {})?.bit.lines.map((l) => l.text).join(' ') ?? ''
  const thread = prologueThreads.filter((t) => t.id === 'whichRoom' && within(story)(t.at))
  const overheard = thread.flatMap((t) => t.lines.map((l) => `${capital(townsperson(l.who).name)}: ${l.text}`))
  return { kind: 'talk', title: capital(her.name), text: [greet, ...overheard].filter(Boolean).join('\n\n'), buttons: [close('Go on up.')] }
}

// The letter to Lucy is the room scene's text, typed out at TYPE_RATE characters a second.
export const TYPE_RATE = 60

const letterLength = (g: Game): number => menu(g.story).text.length

export const typing = (g: Game): boolean => g.panel?.kind === 'letter' && (g.typed ?? 0) < letterLength(g)

const letterPanel = (story: State, done: boolean): Panel => {
  const m = menu(story)
  return {
    kind: 'letter',
    title: m.title,
    text: m.text,
    buttons: [done ? { id: 'fold', label: 'Fold it and leave it by the door' } : { id: 'finish', label: 'Finish the letter' }],
  }
}

const typed = (g: Game, n: number): Game => {
  const all = letterLength(g)
  const at = Math.min(all, n)
  return at < all ? { ...g, typed: at } : { ...g, typed: at, panel: letterPanel(g.story, true) }
}

// The panel's text as shown: the letter as far as it is typed, any other panel whole.
export const panelText = (g: Game): string =>
  g.panel?.kind === 'letter' ? g.panel.text.slice(0, Math.floor(g.typed ?? 0)) : (g.panel?.text ?? '')

// Whether a prop that shows the letter's state, or the cigarette Lucy dropped, is drawn.
export const shows = (g: Game, w: Mark | undefined): boolean =>
  w === undefined || (w === 'doused' ? g.doused === true : (w === 'folded') === (g.letter === 'folded'))

export const interact = (g: Game): Game => {
  const target = focus(g)
  if (!target) return canLight(g) ? { ...g, vel: zero, holding: { id: CIGARETTE, progress: 0, time: LIGHT_TIME } } : g
  const id = target.id
  if (target.hold) return { ...g, vel: zero, holding: { id, note: target.note, progress: 0, time: target.hold } }
  if (g.space === 'bar') {
    if (id === 'wade') return { ...g, panel: g.story.scene === 'p_bar' ? storyPanel(g.story, ['texas', 'munitions'], [close('Not yet.')]) : storyPanel(g.story, [], [close('Back to the table.')]) }
    if (id === 'curly') return { ...g, panel: storyPanel(g.story, [], [close('Back to the table.')]) }
    if (id === 'door' && target.note) return arrive(sendNote(g, target.note))
  }
  if (g.space === 'boarding') {
    if (id === 'landlady') return { ...g, panel: landladyPanel(g.story) }
    if (id === 'stair') return arrive(g)
    if (id === 'front') return arrive(g)
  }
  if (g.space === 'room') {
    if (id === 'desk') return { ...g, panel: letterPanel(g.story, false), typed: 0 }
    if (id === 'bed' && target.note) return arrive(sendNote(g, target.note))
    if (id === 'downstairs') return enter(g, 'boarding', STAIR_FOOT, 0)
  }
  if (g.space === 'camp' && id === 'plane') return arrive(g)
  if (g.space === 'downtown') {
    const door = doors.find((d) => d.id === id)
    if (door && doorOpen(g, id)) return door.via ? enter(g, door.via, spaces[door.via].spawn) : arrive(g)
    if (door?.locked) return { ...g, panel: locked(door.title) }
  }
  if (g.space === 'line' && id === 'woman') return { ...g, panel: storyPanel(g.story, ['findEli', 'stayOnLine'], [close('Keep passing bags.')]) }
  // Barnette at the bars is decision 1: a held choice. The game stops and asks, with no way to walk off and no clock.
  if (g.space === 'jail') return { ...g, panel: storyPanel(g.story, allNotes(g.story), id === 'ashby' ? [close('Step back.')] : []) }
  // At the help tent the story's own menu opens at Joan, or at the flap where she catches Wade's sleeve.
  if (g.space === 'helpTent') return { ...g, panel: storyPanel(g.story, allNotes(g.story), [close('Step back.')]) }
  if (g.space === 'office') {
    if (id === 'ledgers') return { ...g, carrying: 'ledger' }
    if (id === 'handLedger') return { ...g, carrying: undefined }
    if (id === 'lucy') return { ...douse(g), panel: storyPanel(g.story, menu(g.story).options.map((o) => o.note), [close('Back to the ledgers.')]) }
  }
  if (g.space === 'flood' && id === 'skiff') return { ...g, panel: storyPanel(g.story, ['continue']) }
  return g
}

export const press = (g: Game, button: string): Game => {
  if (button === 'close') return { ...g, panel: undefined }
  if (button === 'retry') return enter(g, g.space)
  if (button === 'restart') return start()
  if (button === 'continue') return arrive(g)
  if (g.home) {
    if (button === 'finish') return { ...g, home: penDown(g.home) }
    if (!button.startsWith('note:') || g.home.writing) return g
    const note = button.slice(5)
    return { ...sendNote(g, note), home: choose(g.home, note) }
  }
  if (button === 'finish') return typed(g, letterLength(g))
  if (button === 'fold') return { ...g, panel: undefined, typed: undefined, letter: 'folded' }
  if (button.startsWith('note:')) {
    const next = sendNote(g, button.slice(5))
    if (!leftPrologue(g.story, next.story)) return arrive(next)
    // Climbing into the skiff sends the story on; the ride plays out before the end card comes up.
    return g.space === 'flood' ? board(next) : { ...next, panel: endCard }
  }
  return g
}

const seated = (g: Game, ride: number): Game => {
  const r = rideAt(ride)
  return { ...g, ride, pos: r.seat, facing: r.heading, view: r.heading, vel: zero }
}

const board = (g: Game): Game => ({ ...seated(g, 0), panel: undefined, holding: undefined })

// The ride: the skiff poles on along its path whatever the player does, and the end card comes up on the black.
const ride = (g: Game, dt: number): Game => {
  const next = seated(g, (g.ride ?? 0) + dt)
  return rideOver(next.ride) ? { ...next, panel: endCard } : next
}

const finish = (g: Game, h: Holding): Game => {
  const done = { ...g, holding: undefined }
  if (h.id === CIGARETTE) return { ...done, lit: true }
  if (!h.note) return done
  if (isSpot(h.id)) return { ...sendNote(done, h.note), hidden: h.id }
  return press(done, `note:${h.note}`)
}

export const inReach = (g: Game, id: string): boolean => {
  const spot = available(g).find((i) => i.id === id)
  return spot !== undefined && distance(g.pos, spot) <= spot.r
}

const hold = (g: Game, input: Input, dt: number): Game => {
  const h = g.holding
  if (!h) return g
  if (!input.hold || (h.id !== CIGARETTE && !inReach(g, h.id))) return { ...g, holding: undefined }
  if (seen(g)) return busted(g)
  const progress = h.progress + dt
  return progress < h.time ? { ...g, holding: { ...h, progress } } : finish(g, h)
}

const turn = (from: number, to: number, rate: number): number => {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + Math.max(-rate, Math.min(rate, d))
}

const toward = (from: Vec, to: Vec, rate: number): Vec => {
  const d = sub(to, from)
  return length(d) <= rate ? to : add(from, scale(normalize(d), rate))
}

export const ahead = (facing: number): Vec => vec(Math.sin(facing), Math.cos(facing))

export const topSpeed = (input: Input, interior: boolean): number => (input.run ? (interior ? INDOOR_PACE : JOG) : WALK)

const walk = (g: Game, input: Input, dt: number): Game => {
  const push = Math.min(1, length(input.dir))
  const heading = push > 0 ? angleTo(zero, input.dir) : g.facing
  const facing = push > 0 ? turn(g.facing, heading, TURN_RATE * dt) : g.facing
  const off = angleBetween(facing, heading)
  const interior = spaces[g.space].interior
  const want = off <= TURN_GO ? topSpeed(input, interior) * push * Math.cos(off) : 0
  const vel = toward(g.vel, scale(ahead(facing), want), (want >= length(g.vel) ? (interior ? INDOOR_ACCEL : ACCEL) : DECEL) * dt)
  const arriving = push > 0 && input.limit !== undefined && length(vel) * dt >= input.limit
  const step = arriving ? scale(normalize(input.dir), input.limit ?? 0) : scale(vel, dt)
  const pos = length(step) > 0 ? move(g.pos, step, length(step), solids(spaces[g.space], g.story)) : g.pos
  return { ...g, pos, facing, vel: arriving ? zero : dt > 0 ? scale(sub(pos, g.pos), 1 / dt) : g.vel }
}

export const tick = (g: Game, input: Input, dt: number): Game => {
  const t = g.t + dt
  if (g.home?.writing) return pen({ ...g, vel: zero, t }, g.home, dt)
  if (typing(g)) return typed({ ...g, vel: zero, t }, (g.typed ?? 0) + TYPE_RATE * dt)
  if (g.panel) return { ...g, vel: zero, t: g.space === 'camp' ? g.t : t }
  if (riding(g.ride)) return ride({ ...g, t }, dt)
  const walked = walk({ ...g, t }, input, dt)
  return douse(hold({ ...walked, view: input.view ?? walked.facing }, input, dt))
}

// The player is whoever the story's pov(state) says (pov.ts).
export const playerBody = (g: Game): Body => bodyFor(g.story, riding(g.ride))

// The player stands in the world only in a space of the story's act: not over the story backdrop, and not in the
// prologue's flood under the end card, where the story has already moved on to Wade.
export const inWorld = (g: Game): boolean => (riding(g.ride) ? !ended(g) : spaces[g.space].act === menu(g.story).act)

export const playerMotion = (g: Game): Motion => ({ speed: length(g.vel), sneaking: g.space === 'camp', activity: riding(g.ride) ? 'sit' : 'stand', talking: false })

// How high Owen's feet are: on the skiff's floor while riding, else on whatever deck he stands on (the flood's porch
// and walkway), else the ground.
export const footY = (g: Game): number => (riding(g.ride) ? DECK_Y : standAt(spaces[g.space], g.pos))

// The heading the camera is held behind on the ride (skiff.ts, keepBehind); none on foot.
export const heldBehind = (g: Game): number | undefined => (riding(g.ride) ? g.facing : undefined)

export const ended = (g: Game): boolean => g.panel?.kind === 'end'

export const handedOff = (g: Game): boolean => g.handoff === true

export const textBuildHash = (g: Game): string => `#path=${g.path.join(',')}`

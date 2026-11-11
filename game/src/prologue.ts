import type { CacheSpot, State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu, place, pov, send } from '../../text-game/src/story.ts'
import { prologueThreads, prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import { say, within } from '../../text-game/src/ambient/select.ts'
import { route } from './router.ts'
import type { Interactable, Vec } from './world.ts'
import { add, angleBetween, angleTo, distance, length, move, normalize, pick, scale, sees, sub, vec } from './world.ts'
import type { Mark, SpaceId } from './levels.ts'
import { STAIR_FOOT, flooded, occluders, solids, spaces, standAt } from './levels.ts'
import type { Watch } from './curly.ts'
import { CAUGHT_LINE, CAUGHT_TIME, CURLY_HALF_ANGLE, CURLY_RANGE, calm, curlyPose, gaze, listen, notice } from './curly.ts'
import { groundY, surfaceAt } from './campGround.ts'
import type { HidePose } from './camp.ts'
import { hidePose } from './camp.ts'
import { doors, legs, spawnAt, yawOf } from './downtown.ts'
import { jailSpot, letOut } from './jail.ts'
import { tentSpot } from './hospital.ts'
import { officeSpot, takesIt } from './landoffice.ts'
import type { Letter as Home } from './letters.ts'
import { choose, finish as penDown, open as openHome, turn as turnPage, write, written } from './letters.ts'
import { FLOOD_AT, FLOOD_FACING } from './highwater.ts'
import { riding } from './skiff.ts'
import { boatIn } from './cabinRide.ts'
import type { Look } from './knot.ts'
import { knotSpot } from './knot.ts'
import { searchSpot } from './searchEli.ts'
import { entryFrom, walksUp } from './trail.ts'
import { paceThrough, wash } from './hazards.ts'
import { isRoomThing, roomThingsOpen, useRoom } from './room.ts'
import { SLEEP_TIME } from './boardingHouseSleep.ts'
import { POST_BOX, canMail, dockNote, morning } from './floatDock.ts'
import { FLIGHT_TIME, OWEN_SEAT, flying, legAt, seatAt, skipSpot } from './flight.ts'
import type { Brawl } from './barfight.ts'
import { FACING_HANK, begin, done as fought, hankSpot, noteOf, openedOf, openingButtons, play, roomOf, sceneNotes, starts, wade } from './barfight.ts'
import type { Intent } from './combat.ts'
import type { Lab } from './photoLab.ts'
import { DRAWERS, arrival, baseEntry, catcher, counterNotes, found as searched, labSpot, messy, pick as pickLab, restart as restartLab, scold as scoldLab, searchTime, step as labStep } from './photoLab.ts'
import { LAB_SPOT } from './eielson.ts'
import { GO, TABLE_SPOT, asks, tableNotes, tableSpot } from './kitchen.ts'
import type { Cabinet, Turn } from './majorsCabinet.ts'
import { AIRMAN, DESK_LOOK, DESK_SPOT, DIAL_SPOT, PRY_SPOT, arrival as cabinetArrival, cabinetSpot, dialText, held as cabinetHeld, look as lookDesk, pried, pry, restart as restartCabinet, scold as scoldCabinet, step as cabinetStep, tryHandle, turn as turnDial } from './majorsCabinet.ts'
import type { Bar } from './hotelBar.ts'
import { SPAWN as BAR_DOOR, SPAWN_FACING as BAR_FACING, arrival as barArrival, barSpot, finished as setDone, isSeat, restart as restartBar, seatOf, setNote, sit, stared, step as barStep, strum } from './hotelBar.ts'
import type { TieLook } from './bushStrip.ts'
import { isStripSpace, rollOut, stripSpot, useSpot } from './bushStrip.ts'

import type { Body, Motion } from './cast.ts'
import { INDOOR_PACE, JOG_SPEED, WALK_SPEED } from './cast.ts'
import { bodyFor } from './pov.ts'

export { ROUND_TIME } from './levels.ts'
export { HIDE_TIME } from './camp.ts'

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
  // What Wade is leaning over to look at close: the knot at the cabin (knot.ts), while its menu is open.
  look?: Look | TieLook
  // Seconds since the current took Wade's feet on the search for Eli, while the screen fades (hazards.ts).
  swept?: number
  // The letter to Lucy is out of Owen's jacket and in the post box on Cushman; the dock's note says so (floatDock.ts).
  mailed?: true
  // Seconds into the flight north, from the moment Owen climbs in at the float (flight.ts).
  flight?: number
  // Seconds since Owen lay down in his room: the fade and the date card run, then the story moves to the morning.
  sleeping?: number
  // Curly at the survey camp: his routine's clock, the noise he turned to, how much of Owen he has seen (curly.ts).
  watch?: Watch
  // The barfight at the Silver Pan while it plays (barfight.ts): the fight, from the shove until the law is in.
  brawl?: Brawl
  // The photo lab run on the base, from Wade picking his way in at the counter to walking out with the prints
  // (photoLab.ts).
  lab?: Lab
  // The Major's cabinet after hours, from the hall outside his office to stepping out of it with the files photographed
  // (majorsCabinet.ts).
  cabinet?: Cabinet
  // The hotel bar's set, from Wade coming in with his guitar to the last song (hotelBar.ts).
  bar?: Bar
}>

// The fight's verbs, pressed this frame (fightControls.ts); only the barfight reads them.
export type Verbs = Readonly<{ shove: boolean; grab: boolean; use: boolean }>

export type Input = Readonly<{ dir: Vec; hold: boolean; run?: boolean; limit?: number; view?: number; verbs?: Verbs }>

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
  sleeping: undefined,
  ride: undefined,
  lit: undefined,
  carrying: undefined,
  doused: undefined,
  look: undefined,
  flight: undefined,
  watch: undefined,
  brawl: undefined,
  lab: undefined,
  cabinet: undefined,
  bar: undefined,
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

const talked = (g: Game): boolean => g.story.scene.startsWith('p_talk_')

export const available = (g: Game): readonly Interactable[] =>
  flying(g.flight) || g.brawl ? [] : spaces[g.space].spots.filter((i) => {
    if (g.space === 'bar') return i.id === 'door' ? talked(g) : i.id === 'hank' ? g.story.scene === 'p_bar' : true
    if (g.space === 'camp') return i.id === 'plane' ? g.hidden !== undefined : g.hidden === undefined
    if (g.space === 'flood') return g.story.scene === 'p_end'
    if (g.space === 'downtown' && i.id === POST_BOX) return canMail(g.story, g.mailed === true)
    if (g.space === 'downtown') return doorOpen(g, i.id) || doors.some((d) => d.id === i.id && d.locked)
    if (g.space === 'line') return searchSpot(g.story, i.id)
    if (g.space === 'jail') return jailSpot(g.story, i.id)
    if (g.space === 'helpTent') return tentSpot(g.story, i.id)
    // In August the house is flooded: the only way is down the stair and out the front door.
    if (g.space === 'room') return flooded(g.story) ? i.id === 'downstairs' : i.id === 'bed' ? g.letter === 'folded' : i.id !== 'downstairs' && g.letter === undefined && (!isRoomThing(i.id) || roomThingsOpen(g.story))
    if (g.space === 'boarding') return (i.id === 'front') === flooded(g.story)
    if (g.space === 'office') return officeSpot(g.carrying === 'ledger', i.id)
    if (g.space === 'cabin') return knotSpot(g.story, i.id)
    if (g.space === 'pan') return hankSpot(g.story, g.brawl !== undefined, i.id)
    if (g.space === 'eielson') return labSpot(g.story, g.lab, i.id) || cabinetSpot(g.cabinet, i.id)
    if (g.space === 'kitchen') return tableSpot(g.story, i.id)
    if (g.space === 'hotelBar') return barSpot(g.story, g.bar, i.id)
    if (isStripSpace(g.space)) return stripSpot(g.story, g.space, i.id)
    return true
  })

// In the air the one thing to do is skip to the camp.
export const focus = (g: Game): Interactable | undefined =>
  g.panel ? undefined : flying(g.flight) ? skipSpot(g.pos) : pick(g.pos, g.view, g.facing, available(g))

export const label = (g: Game, i: Interactable): string =>
  (i.note ? menu(g.story).options.find((o) => o.note === i.note)?.label : i.prompt) ?? i.id

export const watchOf = (g: Game): Watch => g.watch ?? calm

// Curly as the camp's watcher: where he stands and looks, and whether he is looking at all (curly.ts).
export const curlyNow = (g: Game) => curlyPose(watchOf(g), g.t, g.pos)

export const watcher = (g: Game) => {
  const p = curlyNow(g)
  return { at: p.at, facing: gaze(p), range: CURLY_RANGE, halfAngle: CURLY_HALF_ANGLE, eyes: p.eyes }
}

export const seen = (g: Game): boolean => {
  if (g.space !== 'camp') return false
  const w = watcher(g)
  return w.eyes && sees(w, g.pos, occluders(spaces.camp))
}

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

// The notes a menu offers: all of them, except at the float dock, where the walk down has already ended one way (the
// letter in the post box or still in Owen's jacket) and only that note is on offer (floatDock.ts).
const offered = (g: Game): readonly string[] => (morning(g.story) ? [dockNote(g.mailed === true)] : allNotes(g.story))

// The scene's whole menu: through the letter view where the story is writing home, else as its story panel.
const menuPanel = (g: Game, extra: readonly Button[] = []): Game => {
  const l = openHome(g.story)
  return l ? { ...g, home: l, panel: homePanel(l) } : { ...g, panel: storyPanel(g.story, offered(g), extra) }
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
  // Off the base or out of Lucy's kitchen to a place with no space yet, Wade leaves the space: the rest of Act 2 plays
  // over the story backdrop, as it did before those places had spaces, and goes on into Act 3 there rather than to the
  // text build.
  // The Major's cabinet plays on the base: in the hall outside his office, or at the cabinet already open.
  const cab = cabinetArrival(g.story)
  if (cab) return { ...enter(g, 'eielson', cab.at, cab.facing), cabinet: cab.cabinet }
  if (r.to !== 'space' && (g.space === 'eielson' || g.space === 'kitchen' || g.space === 'hotelBar' || isStripSpace(g.space))) return arrive(enter(g, 'story'))
  if (r.to === 'text') return { ...g, panel: undefined, holding: undefined, handoff: true }
  if (r.to === 'menu') return menuPanel(g, allNotes(g.story).length ? [] : [restart])
  // The flood is reached through the house: from anywhere else Owen starts in his room, rain on the window, and comes
  // out of the front door onto his porch.
  if (r.space === 'flood' && g.space !== 'flood') return g.space === 'boarding' ? enter(g, 'flood', FLOOD_AT, FLOOD_FACING) : enter(g, 'room')
  // On the search for Eli, Wade wades up to the help tent from the street: the way up waits at the end of Cushman.
  if (walksUp(g.space, r.space, g.path)) return { ...g, panel: undefined }
  // To the cabin Wade goes by boat with Eli: in it from the first frame; at the end of the ride he leans to the knot.
  if (r.space === 'cabin' && g.space !== 'cabin') return board(enter(g, 'cabin'))
  // At the Silver Pan Wade comes in on his stool facing Hank, the bar going on around him; listening to Hank opens his
  // speech, which ends on the drunk's shove and the scene's prompt. A link straight into the fight's later scenes plays
  // them as their menus.
  if (r.space === 'pan') return starts(g.story) ? enter(g, 'pan', spaces.pan.spawn, FACING_HANK) : menuPanel(enter(g, 'pan', spaces.pan.spawn, FACING_HANK))
  // The photo lab is Lucy's ask first: Wade comes into her kitchen, and her table asks whether he goes (kitchen.ts).
  if (r.space === 'eielson' && asks(g.story) && g.space !== 'kitchen' && g.space !== 'eielson') return enter(g, 'kitchen')
  // On the base each scene starts at its place's spawn: Wade walks to what it offers there, or its menu opens there.
  if (r.space === 'eielson') {
    const e = baseEntry(g.story)
    const into = { ...enter(g, 'eielson', e.at, e.facing), lab: arrival(g.story, e.at, e.facing) }
    return available(into).length ? into : menuPanel(into)
  }
  // With his guitar Wade comes in at the hotel bar's door, the stools to choose from (hotelBar.ts); a link to what he
  // heard there opens its menu.
  if (r.space === 'hotelBar' && g.space !== 'hotelBar') {
    const into = { ...enter(g, 'hotelBar', BAR_DOOR, BAR_FACING), bar: barArrival(g.story) }
    return available(into).length ? into : menuPanel(into)
  }
  if (r.space !== g.space) {
    // Back in a space with nothing to walk to, the scene plays as its menu. From the tent, Wade comes back down into
    // the town where he went up.
    const entry = entryFrom(g.space, r.space)
    const into = entry ? enter(g, r.space, entry.at, entry.facing) : enter(g, r.space)
    return available(into).length ? into : menuPanel(into)
  }
  // In the flooded town each scene of the search opens its menu at its stop, so Wade wades there; a scene with no
  // stop opens where he stands.
  if (r.space === 'line' && available(g).length) return { ...g, panel: undefined }
  const out = letOut(g.story, g.pos)
  if (r.space === 'jail' && out) return enter(g, 'jail', out.at, out.facing)
  // On the laugh path Joan's line waits for Wade at the flap, on his way out.
  if (r.space === 'helpTent' && !tentSpot(g.story, 'joan')) return { ...g, panel: undefined }
  const back = spaces[r.space].back
  if (back) return { ...g, panel: storyPanel(g.story, [], [close(back)]) }
  return menuPanel(g)
}

const opening = (g: Game): Game => {
  const m = menu(g.story)
  return { ...g, panel: { kind: 'story', title: m.title, text: m.text, buttons: openingButtons(g.story) } }
}

// The fight's player is Wade: the camera and his body follow where the fight has him.
const mirror = (g: Game, b: Brawl): Game => {
  const me = wade(b)
  return { ...g, brawl: b, pos: me.pos, facing: me.facing, view: me.facing, vel: me.vel }
}

// The law is in and the officer has stood in the door: the mission's note goes as the scene notes it applies, one per
// menu, in play order, and the story moves on to the cell.
const report = (g: Game, b: Brawl): Game => arrive(sceneNotes(g.story, noteOf(b)).reduce(sendNote, { ...g, brawl: undefined }))

const brawling = (g: Game, b: Brawl, input: Input, dt: number): Game => {
  const v = input.verbs
  const l = length(input.dir)
  const intent: Intent = { move: l > 1 ? scale(input.dir, 1 / l) : input.dir, run: input.run ?? false, shove: v?.shove ?? false, grab: v?.grab ?? false, use: v?.use ?? false }
  const next = play(b, intent, dt)
  return fought(next) ? report(g, next) : mirror(g, next)
}

export const resume = (story: State, path: readonly number[]): Game => (path.length ? arrive(backdrop(story, path)) : start())

// Smoking is a held action anywhere Wade is on his feet in the world: hold interact with nothing in front of him to
// light one. Not in a boat, where the ride ticks before any hold.
export const CIGARETTE = 'cigarette'
export const LIGHT_TIME = 1.5

export const canLight = (g: Game): boolean => !g.brawl && !g.panel && !g.holding && !g.lit && !riding(g.ride) && pov(g.story) === 'wade' && inWorld(g) && !focus(g)

// Lucy takes a lit cigarette out of Wade's mouth as soon as he is near her, and drops it in the water.
const douse = (g: Game): Game => (g.space === 'office' && g.lit && takesIt(g.pos) ? { ...g, lit: undefined, doused: true } : g)

// Caught hiding the notes: Curly turns to Owen and says so (the busted beat), and then the retry comes up. Neither is
// the story's: it never hears of it (Rule 4).
const caught = (g: Game): Game => ({ ...g, holding: undefined, vel: zero, watch: { ...watchOf(g), caught: 0 } })

const busted = (g: Game): Game => ({
  ...g,
  busts: g.busts + 1,
  panel: { kind: 'busted', title: 'Curly', text: `"${CAUGHT_LINE}"`, buttons: [{ id: 'retry', label: 'Try again' }] },
})

// How Owen looks while he hides the notes at a spot (camp.ts): lifting the floorboard, up the ladder, digging.
export const hiding = (g: Game): HidePose | undefined => {
  const h = g.holding
  return g.space === 'camp' && h && isSpot(h.id) ? hidePose(h.id, h.progress / h.time) : undefined
}

export const beingCaught = (g: Game): boolean => g.watch?.caught !== undefined

const scolded = (g: Game, dt: number): Game => {
  const w = watchOf(g)
  const at = (w.caught ?? 0) + dt
  return at >= CAUGHT_TIME ? busted({ ...g, vel: zero }) : { ...g, vel: zero, watch: { ...w, caught: at } }
}

// Curly's attention, once a frame at the camp: he hears Owen's steps, his alarm runs down, the indicator fills while
// he can see him.
const attend = (g: Game, dt: number): Game => {
  if (g.space !== 'camp') return g
  const heard = listen(watchOf(g), g.t, { pos: g.pos, vel: g.vel, surface: surfaceAt(g.pos) })
  const next = { ...g, watch: heard }
  return { ...next, watch: notice(heard, seen(next), dt) }
}

// The photo lab run, once a frame after Wade's step (photoLab.ts): the way in goes as he steps into the records room,
// the drawers' note as he walks out with the prints, and a watcher who sees him where he has no business stops him.
const labWatch = (g: Game, dt: number): Game => {
  if (!g.lab || g.space !== 'eielson') return g
  const s = labStep(g.lab, g.pos, g.facing, g.holding, dt)
  if (s.send && s.lab.found) return press({ ...g, lab: s.lab }, `note:${s.send}`)
  const sent = s.send ? sendNote(g, s.send) : g
  return s.lab.caught !== undefined ? { ...sent, lab: s.lab, holding: undefined, vel: zero } : { ...sent, lab: s.lab }
}

// Caught in the photo lab: the watcher's line plays, then the retry. The story never hears of it (Rule 4).
const labScolded = (g: Game, lab: Lab, dt: number): Game => {
  const next = scoldLab(lab, dt)
  if (next !== 'busted') return { ...g, vel: zero, lab: next }
  const w = catcher(lab)
  return { ...g, vel: zero, busts: g.busts + 1, panel: { kind: 'busted', title: w.who, text: `"${w.line}"`, buttons: [{ id: 'retry', label: 'Try again' }] } }
}

const retryLab = (g: Game, lab: Lab): Game => {
  const c = lab.checkpoint
  return { ...g, pos: c.at, facing: c.facing, view: c.facing, vel: zero, panel: undefined, holding: undefined, lab: restartLab(lab) }
}

// The Major's cabinet, once a frame after Wade's step (majorsCabinet.ts): the getaway's note goes as he steps out of the
// office with everything back, and the duty airman's light, or his ear while the screwdriver works, stops him.
const cabinetWatch = (g: Game, dt: number): Game => {
  if (!g.cabinet || g.space !== 'eielson') return g
  const s = cabinetStep(g.cabinet, g.pos, g.holding?.id === PRY_SPOT.id, dt)
  if (s.send) return press({ ...g, cabinet: undefined }, `note:${s.send}`)
  return s.cabinet.caught !== undefined ? { ...g, cabinet: s.cabinet, holding: undefined, vel: zero } : { ...g, cabinet: s.cabinet }
}

const cabinetScolded = (g: Game, c: Cabinet, dt: number): Game => {
  const next = scoldCabinet(c, dt)
  if (next !== 'busted') return { ...g, vel: zero, cabinet: next }
  return { ...g, vel: zero, busts: g.busts + 1, panel: { kind: 'busted', title: AIRMAN.who, text: `"${AIRMAN.line}"`, buttons: [{ id: 'retry', label: 'Try again' }] } }
}

const retryCabinet = (g: Game, c: Cabinet): Game => {
  const at = c.checkpoint
  return { ...g, pos: at.at, facing: at.facing, view: at.facing, vel: zero, panel: undefined, holding: undefined, cabinet: restartCabinet(c) }
}

// The dial's panel: the wheels, the number his fingers are on, and giving up on it for the screwdriver.
const DIAL_BUTTONS: readonly Button[] = [
  { id: 'dial:next', label: 'Move to the next number' },
  { id: 'dial:up', label: 'Turn it up one' },
  { id: 'dial:down', label: 'Turn it down one' },
  { id: 'dial:up10', label: 'Turn it up ten' },
  { id: 'dial:down10', label: 'Turn it down ten' },
  { id: 'dial:try', label: 'Try the handle' },
  { id: 'dial:pry', label: 'Give up on the dial. Get the screwdriver.' },
  close('Step back.'),
]

const dialPanel = (c: Cabinet): Panel => ({ kind: 'story', title: "The Major's cabinet", text: dialText(c), buttons: DIAL_BUTTONS })

const dialed = (g: Game, c: Cabinet, button: string): Game => {
  if (button === 'dial:pry') return { ...g, panel: undefined, cabinet: pry(c) }
  if (button !== 'dial:try') {
    const next = turnDial(c, button.slice(5) as Turn)
    return { ...g, cabinet: next, panel: dialPanel(next) }
  }
  const t = tryHandle(c, g.pos, g.facing)
  return t.send ? { ...sendNote(g, t.send), panel: undefined, cabinet: t.cabinet } : { ...g, cabinet: t.cabinet, panel: dialPanel(t.cabinet) }
}

// The hotel bar's set, once a frame while a song is on (hotelBar.ts): Wade sits and plays, and when the last song ends
// the note his hearing earned goes, and the story says what he heard.
const played = (g: Game, bar: Bar, dt: number): Game => {
  const next = barStep(bar, dt)
  if (setDone(next)) return press({ ...g, vel: zero, bar: undefined }, `note:${setNote(g.story, next)}`)
  return { ...g, vel: zero, bar: next }
}

// Stared at in the hotel bar: Tolliver's look holds, then the retry from the start of the song. The story never hears
// of it (Rule 4).
const barStared = (g: Game, bar: Bar, dt: number): Game => {
  const next = stared(bar, dt)
  if (next !== 'busted') return { ...g, vel: zero, bar: next }
  return { ...g, vel: zero, busts: g.busts + 1, panel: { kind: 'busted', title: 'Busted', text: 'That was way too obvious.', buttons: [{ id: 'retry', label: 'Try again' }] } }
}

const retryBar = (g: Game, bar: Bar): Game => {
  const back = restartBar(bar)
  const s = back.seat ? seatOf(back.seat) : undefined
  return { ...g, pos: s?.at ?? BAR_DOOR, facing: s?.facing ?? BAR_FACING, view: s?.facing ?? BAR_FACING, vel: zero, panel: undefined, holding: undefined, bar: back }
}

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
  w === undefined ||
  (w === 'doused'
    ? g.doused === true
    : w === 'posting'
      ? g.holding?.id === POST_BOX
      : w === 'parked'
        ? !flying(g.flight)
        : w === 'mess'
          ? messy(g.lab, g.holding)
          : w === 'pried'
            ? pried(g.cabinet)
            : w === 'roll'
              ? rollOut(g.story)
            : (w === 'folded') === (g.letter === 'folded'))

export const interact = (g: Game): Game => {
  if (flying(g.flight)) return touchDown(g)
  // In the hotel bar, mid-song, interact is the strum (hotelBar.ts).
  if (g.space === 'hotelBar' && g.bar?.song) return { ...g, bar: strum(g.bar) }
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
    if (id === 'bed' && target.note) return { ...g, vel: zero, holding: undefined, sleeping: 0 }
    if (isRoomThing(id)) return useRoom(g, id) ?? g
    if (id === 'downstairs') return enter(g, 'boarding', STAIR_FOOT, 0)
  }
  if (g.space === 'camp' && id === 'plane') return arrive(g)
  if (g.space === 'downtown') {
    const door = doors.find((d) => d.id === id)
    if (door && doorOpen(g, id)) return door.via ? enter(g, door.via, spaces[door.via].spawn) : arrive(g)
    if (door?.locked) return { ...g, panel: locked(door.title) }
  }
  if (g.space === 'line' && id === 'woman') return { ...g, panel: storyPanel(g.story, ['findEli', 'stayOnLine'], [close('Keep passing bags.')]) }
  if (g.space === 'line' && id === 'tent') return enter(g, 'helpTent')
  if (g.space === 'line') return { ...g, panel: storyPanel(g.story, allNotes(g.story), [close('Step back.')]) }
  // Barnette at the bars is decision 1: a held choice. The game stops and asks, with no way to walk off and no clock.
  if (g.space === 'jail') return { ...g, panel: storyPanel(g.story, allNotes(g.story), id === 'ashby' ? [close('Step back.')] : []) }
  // At the help tent the story's own menu opens at Joan, or at the flap where she catches Wade's sleeve.
  if (g.space === 'helpTent') return { ...g, panel: storyPanel(g.story, allNotes(g.story), [close('Step back.')]) }
  if (g.space === 'office') {
    if (id === 'ledgers') return { ...g, carrying: 'ledger' }
    if (id === 'handLedger') return { ...g, carrying: undefined }
    if (id === 'lucy') return { ...douse(g), panel: storyPanel(g.story, menu(g.story).options.map((o) => o.note), [close('Back to the ledgers.')]) }
  }
  // At the cabin Wade leans over the gunwale: the camera goes close on the knot and the scene's menu comes up, with no
  // way to look away from it. Eli looking at it (a1_knot) keeps the close-up.
  if (g.space === 'cabin' && id === 'knot') return { ...g, look: 'knot', panel: storyPanel(g.story, allNotes(g.story)) }
  if (g.space === 'pan' && id === 'hank') return opening(g)
  // In the photo lab the scene's own menu asks when Wade goes back to the records room; whether he does was Lucy's.
  if (g.space === 'eielson' && id === LAB_SPOT.id) return { ...g, panel: storyPanel(g.story, counterNotes(allNotes(g.story)), [close('Step back.')]) }
  // At Lucy's table the scene's own menu asks what Wade does for her: the hotel bar, or the Major's cabinet; or, for
  // the photo lab, whether he goes at all, going taking him to the base.
  if (g.space === 'kitchen' && id === TABLE_SPOT.id) return { ...g, panel: storyPanel(g.story, tableNotes(g.story), [...(asks(g.story) ? [GO] : []), close('Step back.')]) }
  // At the drawers the records room's menu asks how Wade searches them; once he has picked, holding searches them, and
  // letting go keeps what he has done.
  if (g.space === 'eielson' && id === DRAWERS.id && g.lab) {
    const l = g.lab
    return l.method ? { ...g, vel: zero, holding: { id, progress: l.searched, time: searchTime(l) } } : { ...g, panel: storyPanel(g.story, allNotes(g.story), [close('Step back.')]) }
  }
  // In the Major's dark office: the desk under the flashlight, and the dial.
  if (g.space === 'eielson' && id === DESK_SPOT.id && g.cabinet) return { ...g, cabinet: lookDesk(g.cabinet), panel: { kind: 'story', title: "The Major's desk", text: DESK_LOOK, buttons: [close('Step back.')] } }
  if (g.space === 'eielson' && id === DIAL_SPOT.id && g.cabinet) return { ...g, vel: zero, panel: dialPanel(g.cabinet) }
  // At the bush strip, the Pan's booth and the hangar door the scene's own menu opens; watching Curly work is only a
  // look, with no note and none of the scene's text (bushStrip.ts).
  if (isStripSpace(g.space)) {
    const u = useSpot(g.story, g.space, id)
    if (u?.quiet) return { ...g, vel: zero, look: u.look, panel: { kind: 'talk', title: menu(g.story).title, text: '', buttons: u.back ? [close(u.back)] : [] } }
    if (u) return { ...g, panel: storyPanel(g.story, u.notes, u.back ? [close(u.back)] : []) }
  }
  if (g.space === 'flood' && id === 'skiff') return { ...g, panel: storyPanel(g.story, ['continue']) }
  // A stool in the hotel bar: Wade sits and the next song starts.
  if (g.space === 'hotelBar' && g.bar && isSeat(id)) {
    const s = seatOf(id)
    return { ...g, pos: s.at, facing: s.facing, view: s.facing, vel: zero, bar: sit(g.bar, id) }
  }
  return g
}

export const press = (g: Game, button: string): Game => {
  if (button === 'close') return { ...g, panel: undefined, look: undefined }
  if (button === 'retry') return g.lab ? retryLab(g, g.lab) : g.cabinet ? retryCabinet(g, g.cabinet) : g.bar ? retryBar(g, g.bar) : enter(g, g.space)
  if (button.startsWith('dial:') && g.cabinet) return dialed(g, g.cabinet, button)
  if (button === 'restart') return start()
  if (button === 'continue') return arrive(g)
  const opened = openedOf(button)
  if (opened && g.space === 'pan' && starts(g.story)) return mirror({ ...g, panel: undefined }, begin(opened, roomOf(spaces.pan.props, spaces.pan.figures)))
  if (g.home) {
    if (button === 'finish') return { ...g, home: penDown(g.home) }
    if (!button.startsWith('note:') || g.home.writing) return g
    const note = button.slice(5)
    return { ...sendNote(g, note), home: choose(g.home, note) }
  }
  if (button === 'finish') return typed(g, letterLength(g))
  if (button === 'fold') return { ...g, panel: undefined, typed: undefined, letter: 'folded' }
  if (button.startsWith('note:')) {
    // In the photo lab the way in and the drawers' method are the run's to play out; the notes go as it goes.
    const lab = g.space === 'eielson' ? pickLab(g.story, g.lab, button.slice(5), g.pos, g.facing) : undefined
    if (lab) return { ...g, panel: undefined, lab }
    const next = sendNote(g, button.slice(5))
    // Climbing into the plane at the float sends the story to the camp; the flight plays out before Owen is there.
    if (takesOff(g.story, next.story)) return takeOff(next)
    if (!leftPrologue(g.story, next.story)) return arrive(next)
    // Climbing into the skiff sends the story on; the ride plays out before the end card comes up.
    return g.space === 'flood' ? board(next) : { ...next, panel: endCard }
  }
  return g
}

const seated = (g: Game, ride: number): Game => {
  const r = boatIn(g.space).course.at(ride)
  return { ...g, ride, pos: r.seat, facing: r.heading, view: r.heading, vel: zero }
}

const board = (g: Game): Game => ({ ...seated(g, 0), panel: undefined, holding: undefined })

// The ride: the boat poles on along its course whatever the player does. At the end of the skiff's the end card comes
// up on the black; Eli's stops with the body off the bow, and Wade leans over to the knot (knot.ts).
const ride = (g: Game, dt: number): Game => {
  const course = boatIn(g.space).course
  const t = (g.ride ?? 0) + dt
  if (t < course.time) return seated(g, t)
  if (g.space === 'flood') return { ...seated(g, t), panel: endCard }
  // A link straight to a scene after the look (Eli looking at the knot) has nothing to lean to: its menu comes up.
  const end = seated(g, course.time)
  return available(end).length ? end : menuPanel(end)
}

// The flight north: the plane goes on along its course whatever the player does, over town and then down at the camp,
// and interact skips it. Owen steps out at the camp where the walk there always starts.
const takesOff = (from: State, to: State): boolean => place(from) === 'floatDock' && place(to) === 'surveyCamp'

const inFlight = (g: Game, t: number): Game => {
  const seat = seatAt(t, OWEN_SEAT)
  const leg = legAt(t)
  const here = leg === g.space ? g : enter(g, leg)
  return { ...here, flight: t, pos: seat.at, facing: seat.heading, view: seat.heading, vel: zero }
}

const takeOff = (g: Game): Game => inFlight({ ...g, panel: undefined, holding: undefined }, 0)

const touchDown = (g: Game): Game => enter(g, 'camp')

const fly = (g: Game, dt: number): Game => {
  const t = (g.flight ?? 0) + dt
  return t >= FLIGHT_TIME ? touchDown(g) : inFlight(g, t)
}

const finish = (g: Game, h: Holding): Game => {
  const done = { ...g, holding: undefined }
  if (h.id === CIGARETTE) return { ...done, lit: true }
  if (h.id === POST_BOX) return { ...done, mailed: true }
  if (h.id === DRAWERS.id && g.lab) return { ...done, lab: searched(g.lab) }
  if (g.cabinet && cabinetSpot(g.cabinet, h.id)) {
    const t = cabinetHeld(g.cabinet, h.id, g.pos, g.facing)
    return t.send ? { ...sendNote(done, t.send), cabinet: t.cabinet } : { ...done, cabinet: t.cabinet }
  }
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
  if (isSpot(h.id) && watchOf(g).aware >= 1) return caught(g)
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
  const space = spaces[g.space]
  const interior = space.interior
  const pace = space.id === 'line' ? paceThrough(g.pos, standAt(space, g.pos)) : 1
  const want = off <= TURN_GO ? topSpeed(input, interior) * push * Math.cos(off) * pace : 0
  const vel = toward(g.vel, scale(ahead(facing), want), (want >= length(g.vel) ? (interior ? INDOOR_ACCEL : ACCEL) : DECEL) * dt)
  const arriving = push > 0 && input.limit !== undefined && length(vel) * dt >= input.limit
  const step = arriving ? scale(normalize(input.dir), input.limit ?? 0) : scale(vel, dt)
  const pos = length(step) > 0 ? move(g.pos, step, length(step), solids(space, g.story, g.path)) : g.pos
  return { ...g, pos, facing, vel: arriving ? zero : dt > 0 ? scale(sub(pos, g.pos), 1 / dt) : g.vel }
}

// On the flooded street the water has its turn after Wade's step: the current, debris, what's under it (hazards.ts).
const water = (g: Game, dt: number): Game => (g.space === 'line' ? wash(g, dt, standAt(spaces.line, g.pos), solids(spaces.line, g.story, g.path)) : g)

// Asleep: the screen fades and holds on the date card; at the end the night's note goes and the morning begins.
const slumber = (g: Game, dt: number): Game => {
  const sleeping = (g.sleeping ?? 0) + dt
  return sleeping < SLEEP_TIME ? { ...g, sleeping, vel: zero } : arrive(sendNote({ ...g, sleeping: undefined }, 'sleep'))
}

export const tick = (g: Game, input: Input, dt: number): Game => {
  const t = g.t + dt
  if (g.sleeping !== undefined) return slumber({ ...g, t }, dt)
  if (g.home?.writing) return pen({ ...g, vel: zero, t }, g.home, dt)
  if (typing(g)) return typed({ ...g, vel: zero, t }, (g.typed ?? 0) + TYPE_RATE * dt)
  if (g.panel) return { ...g, vel: zero, t: g.space === 'camp' ? g.t : t }
  if (flying(g.flight)) return fly({ ...g, t }, dt)
  if (riding(g.ride)) return ride({ ...g, t }, dt)
  if (g.swept !== undefined) return wash({ ...g, t }, dt, 0, [])
  if (beingCaught(g)) return scolded({ ...g, t }, dt)
  if (g.lab?.caught !== undefined) return labScolded({ ...g, t }, g.lab, dt)
  if (g.cabinet?.caught !== undefined) return cabinetScolded({ ...g, t }, g.cabinet, dt)
  if (g.bar?.caught !== undefined) return barStared({ ...g, t }, g.bar, dt)
  if (g.bar?.song) return played({ ...g, t }, g.bar, dt)
  if (g.brawl) return brawling({ ...g, t }, g.brawl, input, dt)
  const walked = attend(water(walk({ ...g, t }, input, dt), dt), dt)
  const after = hold({ ...walked, view: input.view ?? walked.facing }, input, dt)
  return cabinetWatch(labWatch(douse(after), dt), dt)
}

// The player is whoever the story's pov(state) says (pov.ts).
export const playerBody = (g: Game): Body => bodyFor(g.story, g.space === 'flood' && riding(g.ride))

// The player stands in the world only in a space of the story's act: not over the story backdrop, and not in the
// prologue's flood under the end card, where the story has already moved on to Wade.
export const inWorld = (g: Game): boolean => (riding(g.ride) ? !ended(g) : spaces[g.space].act === menu(g.story).act)

const sitting = (g: Game): boolean => riding(g.ride) || flying(g.flight) || (g.space === 'pan' && (!g.brawl || wade(g.brawl).stance === 'seated')) || (g.space === 'hotelBar' && g.bar?.song !== undefined)

export const playerMotion = (g: Game): Motion => ({ speed: length(g.vel), sneaking: g.space === 'camp', activity: sitting(g) ? 'sit' : 'stand', talking: false })

// How high Owen's feet are: on the plane's cabin floor in the air, on the skiff's floor while riding, else on whatever deck he stands on (the flood's porch
// and walkway), else the ground.
export const footY = (g: Game): number =>
  flying(g.flight) ? seatAt(g.flight, OWEN_SEAT).y : riding(g.ride) ? boatIn(g.space).deck : g.space === 'camp' ? groundY(g.pos.x, g.pos.z) : standAt(spaces[g.space], g.pos)

// The heading the camera is held behind on the ride and the flight (skiff.ts, keepBehind); none on foot.
export const heldBehind = (g: Game): number | undefined => (riding(g.ride) || flying(g.flight) ? g.facing : undefined)

export const ended = (g: Game): boolean => g.panel?.kind === 'end'

export const handedOff = (g: Game): boolean => g.handoff === true

export const textBuildHash = (g: Game): string => `#path=${g.path.join(',')}`

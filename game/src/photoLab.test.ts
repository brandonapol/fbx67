import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, place, send, sendMission } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, label, press, shows, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route } from './router.ts'
import { DRAWERS, LAB_SPOT, RECORDS, spawnAt } from './eielson.ts'
import { engineSenders, walk } from './notesRatchet.ts'
import { GO, TABLE_SPOT } from './kitchen.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import { angleTo, distance, sub, vec } from './world.ts'
import type { Method, Way } from './photoLab.ts'
import { CLERK_BACK, SEARCH_TIME, WATCH, WAY_NOTE, figuresOf, labOccluders, looks, poseAt, roundTime, spotter } from './photoLab.ts'
import { AT_DRAWERS, HIDE, act, labNext, playLab } from './photoLabBot.ts'
import { stealthOf } from './stealthView.ts'

// The photo lab on the base (docs/acts/act2-missions.md, section 1): the story's photo lab and records room route to
// the Eielson blockout. Lucy asks first, at her kitchen table (kitchen.test.ts), where refusing is a conversation with
// her; agreeing, Wade comes in at the lab's front door and picks his way in at the counter's open end; the run
// plays from there: past the counter, down the hall, into the records room (the way in's note), the drawers searched,
// and out with the prints (the drawers' note). Played headless and checked against the text build on each `--choices`
// path; busted retries never reach the story.

const DT = 1 / 30
const textBuild = (g: Game) => replay(g.path).at(-1)!

// a2_major's one choice from the Act 2 start lands on a2_photos.
const PHOTOS = [...ACT2_PATH.split(',').map(Number), 1]

// Lucy asks in her kitchen; Wade sits down at her table and tells her he will get them.
const asked = startFrom(`#path=${PHOTOS.join(',')}`, '')

const walkTo = (g: Game, to: { x: number; z: number }): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel && cur.lab?.caught === undefined && cur.space === g.space; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(vec(to.x, to.z), cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

const atTable = (g: Game): Game => {
  const near = walkTo(g, vec(-0.5, 0))
  return tick(near, { ...still, view: angleTo(near.pos, TABLE_SPOT) }, DT)
}

const arrived = press(interact(atTable(asked)), GO.id)

const walkThrough = (g: Game, ps: readonly (readonly [number, number])[]): Game => ps.reduce((cur, [x, z]) => walkTo(cur, vec(x, z)), g)

const wait = (g: Game, seconds: number): Game => {
  let cur = g
  for (let n = 0; n < seconds / DT && !cur.panel; n++) cur = tick(cur, still, DT)
  return cur
}

// Walks from the front door to within reach of the counter's open end and turns to it, as a player does.
const atCounter = (): Game => {
  const near = walkTo(arrived, vec(161.4, 36.8))
  return tick(near, { ...still, view: angleTo(near.pos, LAB_SPOT) }, DT)
}

const goes = (way: Way): Game => press(interact(atCounter()), `note:${WAY_NOTE[way]}`)

test('the photo lab routes to the base: Wade comes in at its front door, with the records room to walk to', () => {
  assert.equal(arrived.story.scene, 'a2_photos')
  assert.deepEqual(route(arrived.story, 'story'), { to: 'space', space: 'eielson' })
  assert.equal(arrived.space, 'eielson')
  const door = spawnAt('photoLab')
  assert.deepEqual(arrived.pos, vec(door.x, door.z))
  assert.equal(arrived.panel, undefined, 'no menu until he walks to it')
  assert.deepEqual(available(arrived), [LAB_SPOT])
  const there = atCounter()
  assert.equal(focus(there)?.id, LAB_SPOT.id)
  assert.equal(label(there, LAB_SPOT), LAB_SPOT.prompt)
})

test("at the counter the scene's own menu asks when Wade goes in, the ways in only, and asking sends nothing", () => {
  const counter = interact(atCounter())
  assert.equal(counter.panel?.title, menu(arrived.story).title)
  assert.deepEqual(counter.panel?.buttons.map((b) => b.id), [...Object.values(WAY_NOTE).map((n) => `note:${n}`), 'close'])
  assert.ok(!counter.panel?.buttons.some((b) => b.id === 'note:refuse'), 'refusing is a conversation with Lucy, not the counter')
  assert.deepEqual(counter.story, arrived.story)
})

test('picking a way in starts the run at the counter and sends nothing yet', () => {
  ;(['lunch', 'key'] as const).forEach((way) => {
    const g = goes(way)
    assert.equal(g.panel, undefined)
    assert.deepEqual(g.story, arrived.story, 'the story is still at the counter')
    assert.equal(g.lab?.way, way)
    assert.equal(g.lab?.phase, 'in')
    assert.deepEqual(available(g), [], 'the counter has had its answer')
  })
})

// --- The lab's people ---

test("at lunch the clerk goes out the front door, and comes back early to look into the records room", () => {
  const clerk = WATCH.lunch.find((w) => w.id === 'clerk')!
  assert.deepEqual(poseAt(clerk, 0).at, vec(156, 39), 'behind his counter at noon')
  assert.equal(poseAt(clerk, 40).away, true, 'out to lunch')
  const back = Array.from({ length: 60 }, (_, i) => poseAt(clerk, CLERK_BACK + i))
  assert.ok(back.some((p) => distance(p.at, vec(170, 52.6)) < 0.1 && p.speed === 0), 'he stops in the records room door')
  assert.deepEqual(poseAt(clerk, 1000).at, vec(156, 39), 'and is behind the counter for the afternoon')
})

test('the aisle behind the first row of drawers is out of sight of both doors; the drawers are not', () => {
  const doorway = WATCH.lunch.find((w) => w.id === 'airman')!
  const looking = Array.from({ length: Math.ceil(roundTime(doorway)) * 4 }, (_, i) => i / 4).filter((t) => {
    const p = poseAt(doorway, t)
    return distance(p.at, vec(170, 52.6)) < 0.1 && p.speed === 0
  })
  assert.ok(looking.length > 0, 'the airman stops in the records room door')
  assert.ok(looking.every((t) => !looks(doorway, poseAt(doorway, t), HIDE)))
  assert.ok(looking.some((t) => looks(doorway, poseAt(doorway, t), AT_DRAWERS)))
  const sergeant = WATCH.key[0]!
  const sweep = Array.from({ length: Math.ceil(roundTime(sergeant)) * 4 }, (_, i) => i / 4)
  assert.ok(sweep.every((t) => !looks(sergeant, poseAt(sergeant, t), HIDE)))
  assert.ok(sweep.some((t) => looks(sergeant, poseAt(sergeant, t), AT_DRAWERS)))
  assert.ok(labOccluders.length > 0)
})

test('at lunch nobody minds Wade on the customer side of the counter', () => {
  const g = wait(goes('lunch'), 20)
  assert.equal(g.panel, undefined)
  assert.equal(g.lab?.aware, 0)
  assert.ok(Array.from({ length: 400 }, (_, i) => i / 2).every((t) => !spotter('lunch', t, vec(161.4, 36.8))))
})

// --- Busted ---

test('slipping past the counter while the clerk is still behind it is busted: retry at the counter, the story untouched', () => {
  const g = walkThrough(goes('lunch'), [[164.2, 37.0], [164.6, 39.1], [160, 39.1]])
  assert.equal(g.lab?.by, 'clerk')
  const busted = wait(g, 3)
  assert.equal(busted.panel?.kind, 'busted')
  assert.equal(busted.panel?.title, 'The clerk')
  assert.deepEqual(busted.story, arrived.story, 'busted never reaches the story')
  assert.deepEqual(busted.path, arrived.path)
  const again = press(busted, 'retry')
  assert.equal(again.panel, undefined)
  assert.equal(again.busts, 1)
  assert.equal(again.lab?.clock, 0, 'the clerk is behind his counter again')
  assert.equal(again.lab?.phase, 'in')
  assert.ok(distance(again.pos, vec(161.4, 36.8)) < 0.3, 'back where he picked his way in')
  assert.deepEqual(again.story, arrived.story)
})

test("the stealth eye reads the lab's people: shut where Wade may stand, open and filling once one sees him past the counter", () => {
  const g = goes('lunch')
  assert.deepEqual(stealthOf(g), { shown: true, eye: 'shut', aware: 0, who: 'Nobody', line: undefined })
  const past = walkThrough(g, [[164.2, 37.0], [164.6, 39.1]])
  assert.equal(stealthOf(past).eye, 'open')
  assert.equal(stealthOf(past).who, 'The clerk')
  assert.ok(stealthOf(past).aware > 0)
  const caught = wait(past, 1)
  assert.equal(stealthOf(caught).line, 'The clerk: "Airman? You can\'t be back here."')
  assert.equal(stealthOf(wait(caught, 3)).shown, false, 'the busted panel is up')
})

test('the eye half opens when someone is about to see where Wade stands', () => {
  const g = goes('lunch')
  const at = vec(164.6, 39.1)
  const clock = Array.from({ length: 400 }, (_, i) => i / 10).find((c) => !spotter('lunch', c, at) && spotter('lunch', c + 1, at))
  assert.ok(clock !== undefined)
  assert.equal(stealthOf({ ...g, pos: at, lab: { ...g.lab!, clock } }).eye, 'turning')
})

// Into the records room by the scripted player, then straight to the drawers with the method picked.
const inRecords = (way: Way): Game => {
  let g = goes(way)
  for (let n = 0; g.lab?.phase === 'in'; n++) {
    if (n > 500) throw new Error('never got in')
    g = act(g, labNext(g, 'crossCheck'))
  }
  return g
}

const atDrawers = (g: Game, method: Method): Game => {
  const there = walkThrough(g, [[162.2, 56.3], [AT_DRAWERS.x, AT_DRAWERS.z]])
  const facing = tick(there, { ...still, view: angleTo(there.pos, DRAWERS) }, DT)
  assert.equal(focus(facing)?.id, DRAWERS.id)
  const opened = interact(facing)
  assert.equal(opened.panel?.title, menu(opened.story).title, "the records room's own menu asks how")
  return press(opened, `note:${method}`)
}

test('the way in goes as Wade steps into the records room, on the text build\'s path', () => {
  ;(['lunch', 'key'] as const).forEach((way) => {
    const g = inRecords(way)
    assert.equal(g.story.scene, way === 'lunch' ? 'a2_photos_files' : 'a2_photos_night')
    assert.equal(place(g.story), 'photoRecords')
    assert.deepEqual(g.story, send(arrived.story, WAY_NOTE[way]))
    assert.deepEqual(g.story, textBuild(g), 'parity with the text build')
    assert.equal(g.space, 'eielson', 'he stays where he is')
    assert.ok(g.pos.z > RECORDS[2])
    assert.deepEqual(available(g), [DRAWERS])
  })
})

test('after lockup the duty sergeant catches Wade in the drawers: retry with the drawers open, nothing pulled', () => {
  const g = atDrawers(inRecords('key'), 'crossCheck')
  assert.equal(g.panel, undefined)
  assert.equal(g.lab?.method, 'crossCheck')
  const cp = g.lab!.checkpoint
  // He stays at the drawers, searching in short holds, until the sergeant's flashlight finds him.
  let cur = g
  for (let n = 0; n < 200 && !cur.panel; n++) {
    cur = act(cur, { kind: 'interact', spot: DRAWERS.id, hold: false })
    for (let i = 0; i < 15 && cur.holding; i++) cur = tick(cur, { dir: vec(0, 0), hold: true }, DT)
    cur = wait(cur, 2)
  }
  assert.equal(cur.panel?.kind, 'busted')
  assert.equal(cur.panel?.title, 'The duty sergeant')
  assert.deepEqual(cur.story, g.story, 'busted never reaches the story')
  const again = press(cur, 'retry')
  assert.deepEqual(again.pos, cp.at)
  assert.equal(again.lab?.clock, cp.clock)
  assert.equal(again.lab?.method, 'crossCheck', 'the drawers are open')
  assert.equal(again.lab?.searched, 0, 'before the first print is pulled')
  assert.equal(again.lab?.found, undefined)
  assert.deepEqual(again.story, g.story)
})

test('letting go of the drawers keeps what he has searched', () => {
  const g = atDrawers(inRecords('key'), 'crossCheck')
  const held = interact(g)
  assert.equal(held.holding?.id, DRAWERS.id)
  const some = Array.from({ length: 60 }).reduce<Game>((cur) => tick(cur, { dir: vec(0, 0), hold: true }, DT), held)
  const let_go = tick(some, still, DT)
  assert.equal(let_go.holding, undefined)
  assert.ok(Math.abs(let_go.lab!.searched - 2) < 0.1, `${let_go.lab!.searched}`)
  assert.equal(interact(let_go).holding?.progress, let_go.lab!.searched)
})

// --- The drawers and the mess ---

test('pulling everything leaves a mess you can see; cross-checking leaves the drawers as they were', () => {
  const pull = atDrawers(inRecords('key'), 'pullAll')
  assert.equal(shows(pull, 'mess'), false, 'nothing pulled yet')
  const pulling = tick(interact(pull), { dir: vec(0, 0), hold: true }, DT)
  assert.equal(shows(pulling, 'mess'), true, 'from the first pull')
  const done = Array.from({ length: Math.ceil(SEARCH_TIME.pullAll / DT) + 2 }).reduce<Game>((cur) => tick(cur, { dir: vec(0, 0), hold: true }, DT), pulling)
  assert.equal(done.lab?.found, true)
  assert.equal(shows(done, 'mess'), true, 'and it is there as he walks out')
  const retried = press({ ...done, panel: { kind: 'busted', title: '', text: '', buttons: [] } }, 'retry')
  assert.equal(shows(retried, 'mess'), false, 'the checkpoint is before the first print is pulled')
  const careful = atDrawers(inRecords('key'), 'crossCheck')
  const searching = Array.from({ length: 60 }).reduce<Game>((cur) => tick(cur, { dir: vec(0, 0), hold: true }, DT), interact(careful))
  assert.equal(shows(searching, 'mess'), false)
})

test('the drawers\' note goes only as Wade walks out of the records room with the prints', () => {
  const g = atDrawers(inRecords('key'), 'pullAll')
  const done = Array.from({ length: Math.ceil(SEARCH_TIME.pullAll / DT) + 2 }).reduce<Game>((cur) => tick(cur, { dir: vec(0, 0), hold: true }, DT), interact(g))
  assert.equal(done.lab?.found, true)
  assert.equal(done.story.scene, 'a2_photos_night', 'not while he is still in the room')
  assert.deepEqual(available(done), [], 'the drawers are done')
  const out = walkThrough(done, [[169.8, 54], [170, 51.2]])
  assert.equal(out.story.scene, 'a2_hotel')
  assert.deepEqual(out.story, sendMission(arrived.story, 'key.pulledAll'))
})

// Each mission note's way in and method.
const ways: Readonly<Record<string, readonly [Way, Method] | 'refuse'>> = {
  'lunch.crossChecked': ['lunch', 'crossCheck'],
  'lunch.pulledAll': ['lunch', 'pullAll'],
  'key.crossChecked': ['key', 'crossCheck'],
  'key.pulledAll': ['key', 'pullAll'],
  refused: 'refuse',
}

test("every way through the photo lab is reachable by play and lands where its mission note does, on the text build's path", () => {
  const m = mission(arrived.story)
  assert.equal(m?.id, 'thePhotoLab')
  assert.deepEqual(Object.keys(ways).sort(), m!.endings.map((e) => e.note).sort())
  Object.entries(ways).forEach(([note, how]) => {
    const g = how === 'refuse' ? press(interact(atTable(asked)), 'note:refuse') : playLab(goes(how[0]), how[1])
    assert.equal(g.story.scene, 'a2_hotel', note)
    assert.equal(g.space, 'kitchen', 'off the base, Wade comes into Lucy\'s kitchen')
    if (how === 'refuse') assert.equal(g.panel?.title, menu(g.story).title, 'refusing at her table, he is there for the hotel bar\'s menu')
    else assert.equal(g.panel, undefined, 'he walks to her table for the hotel bar\'s menu')
    assert.equal(g.lab, undefined, 'the run is over')
    assert.deepEqual(g.story, sendMission(arrived.story, note), note)
    assert.deepEqual(g.story, textBuild(g), `parity with the text build on ${note}`)
  })
})

test('a link straight into the records room starts the run at its door, the drawers to search', () => {
  const g = startFrom(`#path=${[...PHOTOS, 1].join(',')}`, '')
  assert.equal(g.story.scene, 'a2_photos_files')
  assert.equal(g.lab?.phase, 'drawers')
  assert.equal(g.lab?.way, 'lunch')
  const room = spawnAt('photoRecords')
  assert.deepEqual(g.pos, vec(room.x, room.z))
  assert.deepEqual(available(g), [DRAWERS])
  const out = playLab(g, 'pullAll')
  assert.deepEqual(out.story, textBuild(out))
  assert.equal(out.story.scene, 'a2_hotel')
})

test('the lab\'s people are drawn only while the run is on, and only in the building', () => {
  assert.deepEqual(figuresOf(arrived.lab), [])
  const g = goes('lunch')
  assert.deepEqual(figuresOf(g.lab).map((f) => f.id), ['clerk', 'airman'])
  assert.deepEqual(figuresOf({ ...g.lab!, clock: 40 }).map((f) => f.id), ['airman'], 'the clerk is out to lunch')
  assert.deepEqual(figuresOf(goes('key').lab), [], 'after lockup the sergeant is out on his round')
})

test("the ratchet counts the lab counter as the sender of every way in, and Lucy's table as the refusal's, and only there", () => {
  const at = engineSenders(walk()).filter((s) => s.key.startsWith('thePhotoLab:'))
  assert.deepEqual([...new Set(at.map((s) => s.key))].sort(), Object.keys(ways).map((n) => `thePhotoLab:${n}`).sort())
  at.forEach((s) => assert.deepEqual([s.space, s.spot], s.key === 'thePhotoLab:refused' ? ['kitchen', TABLE_SPOT.id] : ['eielson', LAB_SPOT.id]))
})

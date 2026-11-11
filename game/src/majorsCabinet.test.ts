import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, sendMission } from '../../text-game/src/story.ts'
import type { SceneId } from '../../text-game/src/types.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, label, press, shows, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import { TABLE_SPOT } from './kitchen.ts'
import { stealthOf } from './stealthView.ts'
import { angleTo, distance, sub, vec } from './world.ts'
import {
  AT_CABINET,
  BACK_SPOT,
  COMBINATION,
  DESK_LOOK,
  DESK_SPOT,
  DIAL_SPOT,
  HALL_AT,
  LOOK_IN,
  LOOK_TIME,
  PAGES,
  PAGE_SPOT,
  PRY_SPOT,
  ROUNDS_TIME,
  WRONG_TIME,
  arrival,
  onRounds,
  opens,
  poseAt,
  sees,
  spotted,
  turn,
} from './majorsCabinet.ts'
import { CORNER, dialIn, faceTo, getIn, holdOn, photograph, playCabinet, readDesk, walkThrough, waitWhile } from './majorsCabinetBot.ts'

// The Major's cabinet (docs/acts/act2-missions.md, section 3), played headless on the base: from the hall outside the
// dark office, a look at the desk, the dial or the screwdriver, every page photographed, everything put back, and out,
// seen or unseen. Each ending is checked against the text build on the path it sends; busted retries never reach the
// story. Refused, Lucy goes herself: the story's own scene, and her heat is the story's.

const DT = 1 / 30
const textBuild = (g: Game) => replay(g.path).at(-1)!

// The Act 2 start's path, every choice the first, on to the scene asked for.
const pathTo = (scene: SceneId): readonly number[] => {
  const path = ACT2_PATH.split(',').map(Number)
  for (let n = 0; replay(path).at(-1)!.scene !== scene; n++) {
    if (n > 60) throw new Error(`no first-choice path to ${scene}`)
    path.push(1)
  }
  return path
}

const asked = startFrom(`#path=${pathTo('a2_co_ask').join(',')}`, '')

const walkTo = (g: Game, to: { x: number; z: number }): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(vec(to.x, to.z), cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// At Lucy's table, her menu open.
const atTable = (): Game => {
  const near = walkTo(asked, vec(-0.5, 0))
  return interact(tick(near, { ...still, view: angleTo(near.pos, TABLE_SPOT) }, DT))
}

const hall = press(atTable(), 'note:search')

test('searching tonight takes Wade from Lucy\'s table to the hall outside the Major\'s dark office', () => {
  assert.equal(hall.story.scene, 'a2_co_heist')
  assert.deepEqual(hall.story, textBuild(hall))
  assert.equal(hall.space, 'eielson')
  assert.deepEqual(hall.pos, HALL_AT)
  assert.equal(hall.panel, undefined, 'no menu: the run plays the scene')
  assert.equal(hall.cabinet?.phase, 'shut')
  assert.deepEqual(available(hall).map((i) => i.id), [DESK_SPOT.id, DIAL_SPOT.id])
})

test('linked straight to a scene of the run, it starts there: the hall when shut, the cabinet when open', () => {
  const heist = startFrom(`#path=${pathTo('a2_co_heist').join(',')}`, '')
  assert.deepEqual([heist.space, heist.pos, heist.cabinet?.phase], ['eielson', HALL_AT, 'shut'])
  const found = startFrom(`#path=${pathTo('a2_co_found').join(',')}`, '')
  assert.deepEqual([found.space, found.pos, found.cabinet?.phase], ['eielson', AT_CABINET, 'open'])
  assert.equal(arrival(asked.story), undefined, 'not at Lucy\'s table')
})

test('the desk shows the circled date and the calendar; looking sends nothing', () => {
  const looked = interact(faceTo(walkThrough(hall, [[182, -62], [182, -68.4]]), DESK_SPOT))
  assert.equal(focus({ ...looked, panel: undefined })?.id, DESK_SPOT.id)
  assert.equal(label(hall, DESK_SPOT), DESK_SPOT.prompt)
  assert.equal(looked.panel?.text, DESK_LOOK)
  assert.match(DESK_LOOK, /NOVEMBER 1969/)
  assert.doesNotMatch(DESK_LOOK, /combination/i, 'the player has to notice it, never be told')
  assert.equal(looked.cabinet?.read, true)
  assert.deepEqual(looked.story, hall.story)
})

test('the combination works only if read from the calendar: the same numbers dialed blind do not open it', () => {
  const blind = dialIn(interact(faceTo(walkThrough(hall, [[182, -62], [185, -68.4], [186, -76.6]]), DIAL_SPOT)), COMBINATION)
  assert.deepEqual(blind.cabinet?.dial, COMBINATION)
  const tried = press(blind, 'dial:try')
  assert.equal(tried.cabinet?.phase, 'shut')
  assert.equal(tried.cabinet?.stuck, true)
  assert.match(tried.panel?.text ?? '', /doesn't give/)
  assert.equal(tried.cabinet!.clock, blind.cabinet!.clock + WRONG_TIME, 'a wrong try costs time, not a fail')
  assert.deepEqual(tried.story, hall.story, 'nothing sent')

  const read = getIn(readDesk(hall), 'combo')
  assert.equal(read.cabinet?.phase, 'open')
  assert.equal(read.story.scene, 'a2_co_found')
  assert.deepEqual(read.story, textBuild(read), 'parity with the text build on combo')
  assert.equal(read.cabinet?.checkpoint.phase, 'open', 'the cabinet open is the second checkpoint')
})

test('a wrong combination after reading the calendar still costs time and opens nothing', () => {
  const c = arrival(hall.story)!.cabinet
  const wrong = turn({ ...c, read: true }, 'up')
  assert.equal(opens(wrong), false)
  assert.equal(opens({ ...c, read: true, dial: COMBINATION }), true)
  assert.equal(opens({ ...c, read: false, dial: COMBINATION }), false)
  assert.deepEqual(turn(turn({ ...c, wheel: 2 }, 'down'), 'down10').dial, [0, 0, 89], 'the wheels wrap')
})

test('the screwdriver opens it and leaves marks that stay through the pages and a retry', () => {
  const forced = getIn(readDesk(hall), 'forced')
  assert.equal(forced.story.scene, 'a2_co_found')
  assert.deepEqual(forced.story, textBuild(forced), 'parity with the text build on forced')
  assert.equal(shows(hall, 'pried'), false, 'no marks before')
  assert.equal(shows(forced, 'pried'), true)
  const shot = holdOn(faceTo(forced, PAGE_SPOT))
  assert.equal(shot.cabinet?.pages, 1, 'a page at a time')
  assert.equal(shows(shot, 'pried'), true)
  const retried = press({ ...shot, panel: { kind: 'busted', title: '', text: '', buttons: [] } }, 'retry')
  assert.equal(retried.cabinet?.pages, 0, 'back to the cabinet open, before the first page')
  assert.equal(shows(retried, 'pried'), true, 'the marks stay')
})

test('every page photographed, then everything put back, before the way out counts', () => {
  const open = getIn(readDesk(hall), 'combo')
  assert.deepEqual(available(open).map((i) => i.id), [PAGE_SPOT.id])
  const done = photograph(open)
  assert.equal(done.cabinet?.pages, PAGES)
  assert.equal(done.cabinet?.phase, 'back')
  assert.deepEqual(available(done), [], 'nothing left to do but leave')
  assert.equal(done.story.scene, 'a2_co_found', 'no note until he steps out')
  assert.ok(!available(open).some((i) => i.id === BACK_SPOT.id), 'putting back comes after the last page')
})

// Each of the mission's four notes when searched, played by the run: the text build's path for it.
test('every way in and getaway lands where its mission note does, on the text build\'s path', () => {
  const m = mission(asked.story)!
  const plays = { 'code.seen': ['combo', 'seen'], 'code.unseen': ['combo', 'unseen'], 'forced.seen': ['forced', 'seen'], 'forced.unseen': ['forced', 'unseen'] } as const
  Object.entries(plays).forEach(([note, [how, seen]]) => {
    const g = playCabinet(hall, how, seen)
    assert.ok(m.endings.some((e) => e.note === note))
    assert.deepEqual(g.story, sendMission(asked.story, note), note)
    assert.deepEqual(g.story, textBuild(g), `${note}: parity on the path`)
    assert.equal(g.busts, 0, `${note}: never busted`)
    assert.equal(g.cabinet, undefined, 'the run is over')
    assert.equal(g.panel?.title, menu(g.story).title)
  })
})

test('busted is the duty airman\'s flashlight on Wade in the office: a retry from the checkpoint, never the story\'s', () => {
  const open = getIn(readDesk(hall), 'combo')
  const exposed = walkTo(open, vec(182, -63.5))
  const caught = waitWhile(exposed, (g) => g.cabinet!.clock < ROUNDS_TIME + 5)
  assert.ok(caught.cabinet?.caught !== undefined, 'caught in the open at the look in')
  assert.match(stealthOf(caught).line ?? '', /duty airman/)
  let g = caught
  for (let n = 0; !g.panel && n < 200; n++) g = tick(g, still, DT)
  assert.equal(g.panel?.kind, 'busted')
  assert.equal(g.busts, 1)
  assert.deepEqual(g.story, open.story, 'the story never hears of it')
  const retried = press(g, 'retry')
  assert.deepEqual(retried.pos, open.cabinet!.checkpoint.at)
  assert.equal(retried.cabinet?.clock, open.cabinet!.checkpoint.clock)
  assert.equal(retried.cabinet?.phase, 'open')
})

test('the airman walks his round out of the desk, looks in at the Major\'s door, and sits back down', () => {
  assert.ok(onRounds(0) && onRounds(ROUNDS_TIME - 1) && !onRounds(ROUNDS_TIME + 1))
  const t = ROUNDS_TIME - 1
  const look = Array.from({ length: 2000 }, (_, i) => (i / 2000) * ROUNDS_TIME).find((c) => distance(poseAt(c).at, LOOK_IN) < 1e-6)
  assert.ok(look !== undefined, 'he stands in the Major\'s door')
  assert.ok(sees(look! + LOOK_TIME / 2, vec(182, -66)), 'his light reaches the middle of the office')
  assert.ok(!sees(look! + LOOK_TIME / 2, CORNER), 'not the dark corner by the door')
  assert.ok(!spotted(t, vec(182, -66), false), 'from his desk he sees nothing of the office')
})

test('the screwdriver is loud: pried with the airman in earshot, Wade is heard', () => {
  const look = Array.from({ length: 2000 }, (_, i) => (i / 2000) * ROUNDS_TIME).find((c) => distance(poseAt(c).at, LOOK_IN) < 1e-6)!
  assert.ok(spotted(look, vec(186, -76.6), true))
  assert.ok(!spotted(look, vec(186, -76.6), false), 'the cabinet is out of his light')
  assert.ok(!spotted(5, vec(186, -76.6), true), 'out of earshot at the far end')
  assert.equal(available({ ...hall, cabinet: { ...hall.cabinet!, prying: true } }).some((i) => i.id === PRY_SPOT.id), true)
})

// #196: refusing, Lucy goes herself. The story's own scene plays as staged, and her heat rises through the story.
test('refused: Lucy goes in herself, seen, and her heat rises through the story', () => {
  const refused = press(atTable(), 'note:refuse')
  assert.equal(refused.story.scene, 'a2_co_lucy')
  assert.equal(refused.space, 'story', 'staged, not playable')
  assert.equal(refused.panel?.title, menu(refused.story).title)
  assert.deepEqual(refused.panel?.buttons.map((b) => b.id), ['note:continue'])
  const on = press(refused, 'note:continue')
  assert.deepEqual(on.story, sendMission(asked.story, 'refused'))
  assert.deepEqual(on.story, textBuild(on), 'parity on the refuse path')
  assert.equal(on.story.lucyHeat, asked.story.lucyHeat + 2)
  assert.equal(on.story.coJob, 'lucy')
  assert.ok(on.story.evidence.includes('coFiles'))
})

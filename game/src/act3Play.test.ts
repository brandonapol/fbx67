import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, send, sendMission } from '../../text-game/src/story.ts'
import type { State } from '../../text-game/src/types.ts'
import type { Game } from './prologue.ts'
import { focus, footY, interact, panelText, press, resume, shows, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { starts } from '../smoke/starts.ts'
import type { Signal } from './survivalPlay.ts'
import { ORDERS, SIGNALS, nextPress, panelOf, sceneNotes } from './survivalPlay.ts'
import { COME_TO, CRASH_TIME, IMPACT, PLACE_AT, SKIP, lucySeat } from './engineOut.ts'
import type { RouteId } from './skiing.ts'
import { ROUTE_NOTES, heightAt } from './skiing.ts'
import { skiOut } from './skiBot.ts'
import { distance, vec } from './world.ts'

// Engine out, the long night and the ski search played through the wired game (prologue.ts), not their modules alone:
// the crash plays from the engine's first cough onto the wreck's hillside, the order prompt starts the night, its steady player plays it to first light, the search's prompt puts Wade on skis, and the
// story lands where the text build's mission notes and its `--choices` path do (docs/acts/act3-missions.md, sections
// 2 and 3).

const DT = 1 / 30

// The search's prompt: the slope's smoke start, one choice back (the ridge).
const SEARCH = starts.find((s) => s.scene === 'a3_ski_down')!.path.split(',').map(Number).slice(0, -1)

// The game at a3_crash: the search's start, one scene back past the night's two choices and the dig.
const crashPath = (): readonly number[] => {
  const at = SEARCH.findIndex((_, i) => replay(SEARCH.slice(0, i + 1)).at(-1)!.scene === 'a3_crash')
  return SEARCH.slice(0, at + 1)
}

// The game at a3_crash as a path start opens it: the crash under way, from the first cough.
const crashStart = (): Game => {
  const p = crashPath()
  return resume(replay(p).at(-1)!, p)
}

// The crash played out frame by frame, with no input, to Lucy coming to in the wreck.
const playCrash = (g: Game): Game => {
  let cur = g
  for (let k = 0; cur.crash !== undefined && k < 30 * 60; k++) cur = tick(cur, still, DT)
  assert.equal(cur.crash, undefined, 'the crash ends')
  return cur
}

// The game at a3_crash's order prompt: the crash played.
const atCrash = (): Game => playCrash(crashStart())

// The menu numbers the text build's --choices path takes for these notes from this state, one per menu.
const choicesFor = (from: State, notes: readonly string[]): readonly number[] =>
  notes.reduce<{ s: State; ns: number[] }>(
    (acc, note) => {
      const o = menu(acc.s).options.find((x) => x.note === note)!
      return { s: send(acc.s, note), ns: [...acc.ns, o.n] }
    },
    { s: from, ns: [] },
  ).ns

test('a path start at a3_crash plays the crash on the wreck’s hillside: Lucy in the right seat, the story waiting', () => {
  const g = crashStart()
  assert.equal(g.story.scene, 'a3_crash')
  assert.equal(g.space, 'wreck')
  assert.equal(g.crash, 0)
  assert.equal(g.panel, undefined, 'no menu while the plane comes down')
  assert.equal(footY(g), lucySeat(0).y, 'she is in the air')
  assert.equal(shows(g, 'wrecked'), false, 'the wreck is not down yet')
  const late = tick(g, still, IMPACT + 0.5)
  assert.equal(shows(late, 'wrecked'), true, 'after the impact the wreck lies on the hillside')
  assert.equal(late.story, g.story, 'the story hears nothing of the crash')
  assert.deepEqual(late.path, g.path)
})

test('coming to after the crash, the order prompt is the story’s own menu, at the cabin over Jake', () => {
  const g = crashStart()
  const up = playCrash(g)
  assert.equal(up.story, g.story)
  assert.deepEqual(up.path, g.path)
  assert.deepEqual(up.pos, COME_TO)
  assert.equal(up.panel?.title, menu(g.story).title)
  assert.deepEqual(up.panel?.buttons.map((b) => b.id), ORDERS.map((o) => `note:${o}`))
  assert.ok(up.t >= CRASH_TIME - DT, 'the crash ran its length')
})

test('interact skips the crash to coming to', () => {
  const g = tick(crashStart(), still, 2)
  assert.equal(focus(g)?.id, SKIP)
  const up = interact(g)
  assert.equal(up.crash, undefined)
  assert.deepEqual(up.panel?.buttons.map((b) => b.id), ORDERS.map((o) => `note:${o}`))
})

test('flying home from the dig, the plane comes down: a3_found’s note plays the crash', () => {
  const p = crashPath()
  const found = resume(replay(p.slice(0, -1)).at(-1)!, p.slice(0, -1))
  assert.equal(found.story.scene, 'a3_found')
  const off = press({ ...found, panel: undefined }, 'note:home')
  assert.equal(off.story.scene, 'a3_crash')
  assert.equal(off.space, 'wreck')
  assert.equal(off.crash, 0)
})

for (const order of ORDERS)
  for (const signal of SIGNALS)
    test(`the crash into the long night, ${order} first and ${signal}: the same state and notes as the --choices path`, () => {
      const g = crashStart()
      const up = playCrash(g)
      const done = playNight(press(up, `note:${order}`), signal)
      const notes = sceneNotes(g.story, `${order}.${signal}`)
      assert.deepEqual(notes, [order, signal], 'the order, then the signal')
      assert.deepEqual(done.path.slice(g.path.length), choicesFor(g.story, notes), 'the notes, one per menu')
      assert.deepEqual(done.story, replay(done.path).at(-1), 'node src/cli.ts --choices <path> reaches the same state')
      assert.deepEqual(done.story, sendMission(g.story, `${order}.${signal}`))
      assert.equal(mission(g.story)?.id, 'theLongNight')
    })

test('on the night Lucy walks between her places on the hillside as the night’s walks run', () => {
  const n = press(atCrash(), 'note:fire')
  assert.equal(n.space, 'wreck')
  assert.deepEqual(n.pos, PLACE_AT.cabin, 'she starts at the cabin')
  const going = press(n, 'night:go:trees')
  const mid = tick(tick(going, still, DT), still, 3)
  assert.ok(distance(mid.pos, PLACE_AT.cabin) > 0.5 && distance(mid.pos, PLACE_AT.trees) > 0.5, 'on her way')
  assert.ok(Math.hypot(mid.vel.x, mid.vel.z) > 0, 'walking')
  let there = mid
  for (let k = 0; there.night?.doing && k < 30 * 60; k++) there = tick(there, still, DT)
  assert.deepEqual(there.pos, PLACE_AT.trees, 'at the spruce')
  assert.deepEqual(there.vel, vec(0, 0))
})

test('the fire shows on the hillside only while it burns', () => {
  let g = press(atCrash(), 'note:fire')
  assert.equal(shows(g, 'burning'), false)
  for (let k = 0; !g.night?.run.carried.lit && k < 30 * 600; k++) {
    const id = nextPress(g.night!)
    g = id ? press(g, id) : tick(g, still, DT)
  }
  assert.equal(shows(g, 'burning'), true)
})

const playNight = (g: Game, signal: Signal): Game => {
  let cur = g
  for (let k = 0; cur.night && k < 100000; k++) {
    const id = nextPress(cur.night, signal)
    if (id) assert.ok(cur.panel?.buttons.some((b) => b.id === id), `${id} is on the panel`)
    cur = id ? press(cur, id) : tick(cur, still, DT)
  }
  assert.equal(cur.night, undefined, 'the night ends')
  return cur
}

const skiTo = (g: Game): Game => {
  const cur = skiOut(g)
  assert.equal(cur.ski, undefined, 'he reaches the top of the slope')
  return cur
}

test('the order prompt starts the night instead of sending the note: the story waits at a3_crash', () => {
  const g = atCrash()
  assert.equal(g.story.scene, 'a3_crash')
  assert.deepEqual(g.panel?.buttons.map((b) => b.id), ORDERS.map((o) => `note:${o}`))
  const n = press(g, 'note:fire')
  assert.ok(n.night)
  assert.equal(n.story, g.story, 'nothing is sent yet')
  assert.deepEqual(n.path, g.path)
  assert.equal(n.panel?.title, 'The long night')
  assert.equal(panelText(n), panelOf(n.story, n.night).text)
  assert.ok(press(n, 'note:jake').night === n.night, 'the story’s notes are not the night’s buttons')
})

test('the night’s panel keeps its object while its buttons are unchanged, and its text is read live', () => {
  const n = press(atCrash(), 'note:fire')
  const later = tick(n, still, DT)
  assert.equal(later.panel, n.panel, 'one frame on, the same buttons, the same panel')
  const busy = press(later, later.panel!.buttons.find((b) => b.id === 'night:go:trees')!.id)
  assert.notEqual(busy.panel, later.panel)
  assert.deepEqual(busy.panel?.buttons, [])
  assert.match(panelText(tick(busy, still, 1)), /Walking to the spruce… \d+ s/)
})

for (const order of ORDERS)
  for (const signal of SIGNALS)
    test(`the long night, ${order} first and ${signal}: played to first light, the story lands where the text build does`, () => {
      const g = atCrash()
      const done = playNight(press(g, `note:${order}`), signal)
      assert.equal(done.story.scene, 'a3_search')
      assert.deepEqual(done.story, sendMission(g.story, `${order}.${signal}`), 'the mission’s note')
      assert.deepEqual(done.story, replay(done.path).at(-1), 'node src/cli.ts --choices <path> reaches the same state')
      assert.equal(done.story.nightOrder, order)
      assert.equal(done.story.nightSignal, signal)
      assert.equal(done.space, 'search', 'the search sets out on the slope')
      assert.deepEqual(done.panel?.buttons.map((b) => b.id), Object.values(ROUTE_NOTES).map((n) => `note:${n}`), 'its prompt as its menu')
    })

test('faded back past the first checkpoint, the night is gone and the order prompt comes up again', () => {
  const g = atCrash()
  let cur = press(g, 'note:jake')
  for (let k = 0; !cur.night?.out && k < 30 * 3600; k++) cur = tick(cur, still, DT)
  assert.ok(cur.night?.out, 'standing in the cabin she freezes')
  assert.deepEqual(cur.panel?.buttons.map((b) => b.id), ['night:retry'])
  const back = press(cur, 'night:retry')
  assert.equal(back.night, undefined)
  assert.equal(back.story, g.story, 'the story never heard of it')
  assert.deepEqual(back.panel?.buttons.map((b) => b.id), ORDERS.map((o) => `note:${o}`))
  assert.deepEqual(back.pos, COME_TO, 'back where she came to')
  assert.equal(back.crash, undefined, 'the crash does not play again')
})

const atSearch = (): Game => startFrom(`#path=${SEARCH.join(',')}`, '')

for (const route of Object.keys(ROUTE_NOTES) as RouteId[])
  test(`the ski search by the ${route}: on skis from the prompt, the top of the slope lands where the text build does`, () => {
    const g = atSearch()
    assert.equal(g.story.scene, 'a3_search')
    assert.equal(g.space, 'search')
    const off = press(g, `note:${ROUTE_NOTES[route]}`)
    assert.equal(off.ski?.route, route)
    assert.equal(off.panel, undefined, 'he is on skis, not at a menu')
    assert.equal(footY(off), heightAt(off.pos), 'his feet are on the slope')
    const there = skiTo(off)
    assert.equal(there.story.scene, 'a3_arm')
    assert.deepEqual(there.story, sendMission(g.story, route), 'the mission’s note')
    assert.deepEqual(there.story, replay(there.path).at(-1), 'node src/cli.ts --choices <path> reaches the same state')
    assert.equal(there.space, 'story', 'the wreck plays over the story backdrop')
    assert.equal(there.panel?.title, menu(there.story).title)
  })

test('a link into the search past the prompt starts Wade on skis on that route', () => {
  const g = startFrom(`#path=${[...SEARCH, 2].join(',')}`, '')
  assert.equal(g.story.scene, 'a3_ski_up')
  assert.equal(g.ski?.route, 'creek')
  assert.equal(g.panel, undefined)
})

test('frozen on the slope he is back where the team split, and the story never hears of it', () => {
  const off = press(atSearch(), 'note:downhill')
  const frozen = { ...off, pos: vec(-25, -82.5), ski: { ...off.ski!, body: { ...off.ski!.body, warmth: 0.5, freezing: 59.99 } } }
  const back = tick(frozen, still, DT)
  assert.deepEqual(back.pos, vec(-40, 40))
  assert.equal(back.story, off.story)
  assert.equal(back.ski?.route, 'ridge')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, sendMission } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { footY, panelText, press, resume, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { starts } from '../smoke/starts.ts'
import type { Signal } from './survivalPlay.ts'
import { ORDERS, SIGNALS, nextPress, panelOf } from './survivalPlay.ts'
import type { RouteId } from './skiing.ts'
import { ROUTE_NOTES, heightAt } from './skiing.ts'
import { skiOut } from './skiBot.ts'
import { vec } from './world.ts'

// The long night and the ski search played through the wired game (prologue.ts), not their modules alone: the order
// prompt starts the night, its steady player plays it to first light, the search's prompt puts Wade on skis, and the
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

const atCrash = (): Game => {
  const p = crashPath()
  return resume(replay(p).at(-1)!, p)
}

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

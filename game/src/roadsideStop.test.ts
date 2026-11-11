import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { State } from '../../text-game/src/types.ts'
import { N } from '../../text-game/src/names.ts'
import { WHEEL, WINDOW_AT, barnetteAt, beatAt, beatsFor, cruiserAt, highway, leans, lightColor, lightsOn, seatAt, stageTime, staged, stops, truckAt } from './roadsideStop.ts'
import { distance } from './world.ts'
import { replay } from '../../text-game/src/engine.ts'
import type { Game } from './prologue.ts'
import { focus, inWorld, interact, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route } from './router.ts'
import { engineSenders, walk } from './notesRatchet.ts'

// Barnette's roadside stop (roadsideStop.ts): staged from the story's own gates, so the stop plays exactly when the
// scene's text has it, and the lean exactly when the text has him lean in the window.

const atHeat = (heat: number): State => ({ ...initialState, scene: 'a2_heat', heat })
const HEATS = [0, 1, 2, 3, 4, 5, 6]

test('a2_heat is on the Richardson Highway, the space\'s place', () => {
  assert.equal(place(atHeat(0)), 'richardsonHighway')
  assert.equal(highway.place, 'richardsonHighway')
  assert.equal(highway.act, menu(atHeat(0)).act)
})

test('the stop plays when, and only when, the story text includes it, at every heat', () => {
  for (const heat of HEATS) {
    const s = atHeat(heat)
    const said = menu(s).text.includes(`${N.barnette} pulls you over`)
    assert.equal(stops(s), said, `heat ${heat}`)
    assert.equal(beatsFor(s).includes('search'), said, `the search at heat ${heat}`)
    assert.equal(cruiserAt(s, 0) !== undefined, said, `the cruiser at heat ${heat}`)
    assert.equal(lightsOn(s, stageTime(s)), said, `the lights at heat ${heat}`)
  }
})

test('the lean in the window plays when, and only when, the story text has it', () => {
  for (const heat of HEATS) {
    const s = atHeat(heat)
    const said = menu(s).text.includes('leans in the window')
    assert.equal(leans(s), said, `heat ${heat}`)
    assert.equal(beatsFor(s).includes('lean'), said, `the beat at heat ${heat}`)
    const end = barnetteAt(s, stageTime(s))
    assert.equal(end !== undefined && distance(end.at, WINDOW_AT) < 0.01, said, `at the window at heat ${heat}`)
  }
})

test('the beats run in order: the drive, the lights, pulling over, the search, the lean', () => {
  const s = atHeat(4)
  const seen: string[] = []
  for (let t = 0; t <= stageTime(s) + 0.05; t += 0.05) {
    const b = beatAt(s, t)
    if (seen.at(-1) !== b) seen.push(b)
  }
  assert.deepEqual(seen, ['drive', 'lights', 'pullOver', 'search', 'lean', 'done'])
  assert.deepEqual(beatsFor(atHeat(0)), ['drive'])
  assert.equal(beatAt(atHeat(0), stageTime(atHeat(0))), 'done')
})

test('Barnette stays in his cruiser until the search, and the lights only come up behind the truck', () => {
  const s = atHeat(3)
  assert.equal(barnetteAt(s, 0), undefined)
  assert.equal(lightColor(s, 0), undefined)
  assert.equal(barnetteAt(atHeat(2), 100), undefined, 'not on the road at all without the stop')
  for (let t = 0; t <= stageTime(s); t += 0.25) {
    const truck = truckAt(s, t).at
    const car = cruiserAt(s, t)!.at
    assert.ok(car.z > truck.z, `the cruiser is behind the truck at ${t}`)
    assert.ok(distance(car, truck) > 5, `and never runs into it at ${t}`)
  }
  assert.ok(lightColor(s, stageTime(s) - 0.1) !== undefined)
})

test('every drive ends parked at the turnout, Wade at the wheel, the wheel spot within reach', () => {
  for (const heat of HEATS) {
    const s = atHeat(heat)
    const seat = seatAt(s, stageTime(s)).at
    assert.ok(distance(seat, WHEEL) <= WHEEL.r, `heat ${heat}`)
    assert.ok(distance(truckAt(s, stageTime(s)).at, truckAt(s, stageTime(s) + 30).at) < 1e-9, 'the truck holds')
    assert.equal(staged(s, 0), true)
    assert.equal(staged(s, stageTime(s)), false)
    assert.equal(staged(s, undefined), false)
  }
})

test('the truck starts on the road where the space puts Wade, inside the space', () => {
  assert.ok(distance(highway.spawn, seatAt(atHeat(0), 0).at) < 1e-9)
  assert.ok(distance(highway.spawn, seatAt(atHeat(5), 0).at) < 1e-9)
  for (const p of highway.props) {
    assert.ok(Math.abs(p.box.x) <= highway.size.w / 2 && Math.abs(p.box.z) <= highway.size.d / 2, `${p.box.x}, ${p.box.z}`)
  }
})

// Played headless from the text build's own `--choices` paths to a2_heat, one per heat it reaches: the stage plays
// through untouched, the scene's menu comes up at the wheel, and every note lands where the text build's does.

const PATHS: Readonly<Record<number, string>> = {
  0: '3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,3,1,3,1,1,1,3,1,2,1,1,1,1,1,1,1,1,1,2',
  2: '1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,3,1,3,1,1,1,1,1,1,1,1,1,1,1,3,1',
  3: '3,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,3',
  4: '2,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1',
}

const DT = 1 / 30
const textBuild = (g: Game) => replay(g.path).at(-1)!
const arrive = (path: string): Game => startFrom(`#path=${path}`, '')
const playStage = (g: Game): Game => {
  let cur = g
  for (let n = 0; !cur.panel; n++) {
    if (n > 30 * 60) throw new Error('the stage never ended')
    cur = tick(cur, still, DT)
  }
  return cur
}

Object.entries(PATHS).forEach(([heat, path]) => {
  const arrived = arrive(path)

  test(`at heat ${heat} a2_heat routes to the highway, and the stage plays before any menu`, () => {
    assert.equal(arrived.story.scene, 'a2_heat')
    assert.equal(arrived.story.heat, Number(heat))
    assert.deepEqual(route(arrived.story, 'story'), { to: 'space', space: 'highway' })
    assert.equal(arrived.space, 'highway')
    assert.equal(arrived.stop, 0)
    assert.equal(arrived.panel, undefined)
    assert.equal(inWorld(arrived), true)
  })

  test(`at heat ${heat} the stage ends at the turnout on the scene's own menu, and sends nothing`, () => {
    const g = playStage(arrived)
    assert.deepEqual(g.story, arrived.story)
    assert.ok(Math.abs(g.t - stageTime(arrived.story)) < 2 * DT, `the stage ran its length (${g.t})`)
    assert.ok(distance(g.pos, seatAt(g.story, stageTime(g.story)).at) < 1e-9, 'Wade at the wheel, parked')
    assert.equal(g.panel?.title, menu(g.story).title)
    assert.equal(g.panel?.text, menu(g.story).text, "the stop's words are the story's")
    assert.deepEqual(g.panel?.buttons.map((b) => b.id), [...menu(g.story).options.map((o) => `note:${o.note}`), 'close'])
  })

  test(`at heat ${heat} interact skips the stage to the same menu`, () => {
    const g = interact(tick(arrived, still, DT))
    assert.deepEqual(g.story, arrived.story)
    assert.equal(g.stop, stageTime(g.story))
    assert.equal(g.panel?.title, menu(g.story).title)
    const back = press(g, 'close')
    assert.equal(focus(back)?.id, WHEEL.id, 'the wheel brings the menu back')
    assert.equal(interact(back).panel?.title, menu(g.story).title)
  })

  test(`at heat ${heat} every note from the wheel lands where the text build does`, () => {
    const g = playStage(arrived)
    for (const o of menu(g.story).options) {
      const next = press(g, `note:${o.note}`)
      assert.deepEqual(next.story, textBuild(next), `${o.note}: parity with the text build`)
      assert.notEqual(next.space, 'highway', `${o.note}: off the highway`)
    }
  })
})

test('the ratchet counts the wheel as the sender of every a2_heat note', () => {
  const at = engineSenders(walk()).filter((s) => s.key.startsWith('a2_heat:'))
  const all = new Set(walk().flatMap((s) => s.offers.map((o) => o.key)).filter((k) => k.startsWith('a2_heat:')))
  assert.deepEqual([...new Set(at.map((s) => s.key))].sort(), [...all].sort())
  at.forEach((s) => assert.deepEqual([s.space, s.spot], ['highway', WHEEL.id]))
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { place } from '../../text-game/src/story.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import type { SceneId, State } from '../../text-game/src/types.ts'
import { CAFE_SCENES, COUNTER_SPOT, SPAWN, WADE_STOOL, cafe, counterSpot, props, visiting } from './dottiesCafe.ts'
import { angleTo, distance, hits, sub, vec } from './world.ts'
import { replay } from '../../text-game/src/engine.ts'
import { menu } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, inWorld, interact, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route } from './router.ts'
import { engineSenders, walk } from './notesRatchet.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import { TABLE_SPOT } from './kitchen.ts'

// Dottie's café (dottiesCafe.ts), the room itself: the three gossip visits are its scenes, and only they use the
// counter. How Wade gets there and what the counter sends is played headless below.

const at = (scene: SceneId): State => ({ ...initialState, scene })

test('the café plays the three gossip visits, each at the café in the story', () => {
  assert.deepEqual(CAFE_SCENES, ['a2_co_gossip', 'a2_heat_gossip', 'a3_rash_gossip'])
  for (const id of CAFE_SCENES) assert.equal(place(at(id)), 'nlCafe', id)
})

test('the counter is only there on a gossip visit', () => {
  for (const id of sceneIds) {
    const s = at(id)
    assert.equal(visiting(s), CAFE_SCENES.includes(id), id)
    assert.equal(counterSpot(s, COUNTER_SPOT.id), CAFE_SCENES.includes(id), id)
  }
  assert.equal(counterSpot(at('a2_heat_gossip'), 'door'), false)
})

test('the room is clear where Wade walks: the door, the aisle, his stool', () => {
  const solid = props.filter((p) => p.solid).map((p) => p.box)
  for (const p of [SPAWN, WADE_STOOL, { x: -1, z: 0 }, { x: 0, z: 0.8 }]) {
    assert.deepEqual(solid.filter((b) => hits(p, b)), [], `${p.x}, ${p.z}`)
  }
  for (const p of props) {
    assert.ok(Math.abs(p.box.x) <= cafe.size.w / 2 && Math.abs(p.box.z) <= cafe.size.d / 2, `inside at ${p.box.x}, ${p.box.z}`)
  }
})

// Played headless on the text build's `--choices` paths: at each gossip point the café note takes Wade in at the door,
// the counter brings up Dottie's read (the scene's own text) and the scene's menu, and each note from there lands where
// the text build's does.

const DT = 1 / 30
const textBuild = (g: Game) => replay(g.path).at(-1)!

// The Act 2 start's path, every choice the first, on to the scene asked for.
const pathTo = (scene: SceneId): readonly number[] => {
  const path = ACT2_PATH.split(',').map(Number)
  for (let n = 0; replay(path).at(-1)!.scene !== scene; n++) {
    if (n > 80) throw new Error(`no first-choice path to ${scene}`)
    path.push(1)
  }
  return path
}

const walkTo = (g: Game, to: { x: number; z: number }): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(vec(to.x, to.z), cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// From the door down the aisle to Wade's stool, turned to the counter.
const atCounter = (arrived: Game): Game => {
  const near = walkTo(walkTo(arrived, vec(SPAWN.x, 0.4)), vec(WADE_STOOL.x, 0.6))
  return tick(near, { ...still, view: angleTo(near.pos, COUNTER_SPOT) }, DT)
}

// The gossip note taken from where its point plays: Lucy's table, the highway (skipping the stage), or the backdrop.
const gossipFrom = (at: SceneId): Game => {
  const g = startFrom(`#path=${pathTo(at).join(',')}`, '')
  const atTable = (): Game => {
    const near = walkTo(g, vec(-0.5, 0))
    return tick(near, { ...still, view: angleTo(near.pos, TABLE_SPOT) }, DT)
  }
  const opened = g.panel ? g : interact(g.space === 'kitchen' ? atTable() : tick(g, still, DT))
  assert.ok(opened.panel?.buttons.some((b) => b.id === 'note:gossip'), `${at} offers the café`)
  const next = press(opened, 'note:gossip')
  assert.deepEqual(next.story, textBuild(next), 'parity with the text build')
  return next
}

const POINTS: Readonly<Record<string, SceneId>> = { a2_co_gossip: 'a2_co_ask', a2_heat_gossip: 'a2_heat', a3_rash_gossip: 'a3_rash' }

Object.entries(POINTS).forEach(([visit, from]) => {
  test(`from ${from} the café note takes Wade in at the café door, the counter to walk to`, () => {
    const g = gossipFrom(from)
    assert.equal(g.story.scene, visit)
    assert.equal(g.space, 'cafe')
    assert.deepEqual(g.pos, SPAWN)
    assert.equal(g.panel, undefined, 'no menu until he sits at the counter')
    assert.deepEqual(available(g), [COUNTER_SPOT])
    assert.equal(inWorld(g), true, 'Wade stands in the café, in Act 3 as in Act 2')
  })

  test(`at ${visit} the counter opens Dottie's read, the scene's own text, and every note lands where the text build does`, () => {
    const arrived = gossipFrom(from)
    const asked = interact(atCounter(arrived))
    assert.deepEqual(asked.story, arrived.story, 'sitting down sends nothing')
    assert.equal(asked.panel?.title, menu(arrived.story).title)
    assert.equal(asked.panel?.text, menu(arrived.story).text)
    assert.deepEqual(asked.panel?.buttons.map((b) => b.id), [...menu(arrived.story).options.map((o) => `note:${o.note}`), 'close'])
    for (const o of menu(arrived.story).options) {
      const next = press(asked, `note:${o.note}`)
      assert.deepEqual(next.story, textBuild(next), `${o.note}: parity with the text build`)
      assert.notEqual(next.space, 'cafe', `${o.note}: out of the café`)
    }
  })
})

test("Dottie's tiers are the story's: at every heat the counter's text is the scene's", () => {
  const arrived = gossipFrom('a2_heat')
  for (let heat = 0; heat <= 6; heat++) {
    const g = { ...arrived, story: { ...arrived.story, heat } }
    assert.equal(interact(atCounter(g)).panel?.text, menu(g.story).text, `heat ${heat}`)
  }
})

test('the café routes only its gossip visits: no other scene at the café walks in there', () => {
  for (const id of sceneIds) {
    const s = at(id)
    const r = route(s, 'story')
    assert.equal(r.to === 'space' && r.space === 'cafe', CAFE_SCENES.includes(id), id)
  }
})

test('the ratchet counts the counter as the sender of every a2_heat_gossip note', () => {
  const at = engineSenders(walk()).filter((s) => s.key.startsWith('a2_heat_gossip:'))
  const all = new Set(walk().flatMap((s) => s.offers.map((o) => o.key)).filter((k) => k.startsWith('a2_heat_gossip:')))
  assert.ok(all.size > 0)
  assert.deepEqual([...new Set(at.map((s) => s.key))].sort(), [...all].sort())
  at.forEach((s) => assert.deepEqual([s.space, s.spot], ['cafe', COUNTER_SPOT.id]))
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, place, sendMission } from '../../text-game/src/story.ts'
import type { SceneId } from '../../text-game/src/types.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, label, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route } from './router.ts'
import { GO, SPAWN, TABLE_SPOT } from './kitchen.ts'
import { DIAL_SPOT, LAB_SPOT, spawnAt } from './eielson.ts'
import type { MissionEnding } from '../../text-game/src/missions.ts'
import { SET, engineSenders, walk } from './notesRatchet.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import { angleTo, distance, sub, vec } from './world.ts'

// Lucy's kitchen (kitchen.ts): the hotel bar (a2_hotel) and the Major's cabinet (a2_co_ask) start at her table.
// Wade comes in at the door, walks to the table, and the scene's own menu asks what he does; the mission plays on
// through its scenes' menus. Played headless and checked against the text build on each `--choices` path.

const DT = 1 / 30
const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

// The Act 2 start's path, every choice the first, on to the scene asked for.
const pathTo = (scene: SceneId): readonly number[] => {
  const path = ACT2_PATH.split(',').map(Number)
  for (let n = 0; replay(path).at(-1)!.scene !== scene; n++) {
    if (n > 40) throw new Error(`no first-choice path to ${scene}`)
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

// Walks from the door to within reach of Lucy's table and turns to it, as a player does.
const atTable = (arrived: Game): Game => {
  const near = walkTo(arrived, vec(-0.5, 0))
  return tick(near, { ...still, view: angleTo(near.pos, TABLE_SPOT) }, DT)
}

// Plays a mission from the table by the menus' buttons in order, each a note the text build's menu offers there.
const play = (arrived: Game, notes: readonly string[]): Game =>
  notes.reduce((g, note) => {
    assert.ok(g.panel?.buttons.some((b) => b.id === `note:${note}`), `${g.story.scene} offers ${note}`)
    const next = press(g, `note:${note}`)
    assert.deepEqual(next.story, textBuild(next), `parity with the text build at ${next.story.scene}`)
    return next
  }, interact(atTable(arrived)))

const starts = { theHotelBar: 'a2_hotel', theMajorsCabinet: 'a2_co_ask' } as const

// The endings played through menus at the table: all but the cabinet searched, which is the base's run, and the hotel
// bar heard, which is played in the bar (hotelBar.ts).
const atTheTable = (id: string) => (e: MissionEnding): boolean => e.applies[0] !== 'search' && (id !== 'theHotelBar' || e.note === 'skipped')

Object.entries(starts).forEach(([id, scene]) => {
  const arrived = startFrom(hash(pathTo(scene)), '')

  test(`${scene} routes to Lucy's kitchen: Wade comes in at the door, with her table to walk to`, () => {
    assert.equal(arrived.story.scene, scene)
    assert.equal(place(arrived.story), 'lucysKitchen')
    assert.deepEqual(route(arrived.story, 'story'), { to: 'space', space: 'kitchen' })
    assert.equal(arrived.space, 'kitchen')
    assert.deepEqual(arrived.pos, SPAWN)
    assert.equal(arrived.panel, undefined, 'no menu until he walks to the table')
    assert.deepEqual(available(arrived), [TABLE_SPOT])
    const there = atTable(arrived)
    assert.equal(focus(there)?.id, TABLE_SPOT.id)
    assert.equal(label(there, TABLE_SPOT), TABLE_SPOT.prompt)
  })

  test(`at ${scene} the table opens the scene's own menu, and opening it sends nothing`, () => {
    const asked = interact(atTable(arrived))
    assert.equal(asked.panel?.title, menu(arrived.story).title)
    assert.deepEqual(asked.panel?.buttons.map((b) => b.id), [...menu(arrived.story).options.map((o) => `note:${o.note}`), 'close'])
    assert.deepEqual(asked.story, arrived.story)
  })

  // Each of the mission's notes played at the table, as the scene notes it applies, one per menu: the text build's path
  // for it. Searching the Major's cabinet tonight takes Wade to the base, where the run sends its notes
  // (majorsCabinet.test.ts), and bringing the guitar takes him to the hotel bar, where the set does (hotelBar.test.ts).
  test(`every way through ${id} from the table lands where its mission note does, on the text build's path`, () => {
    const m = mission(arrived.story)
    assert.equal(m?.id, id)
    m!.endings.filter(atTheTable(id)).forEach((e) => {
      const g = play(arrived, e.applies)
      assert.deepEqual(g.story, sendMission(arrived.story, e.note), e.note)
      const r = route(g.story, 'story')
      assert.equal(g.space, r.to === 'space' ? r.space : 'story', `out of the kitchen, ${g.story.scene} plays where it routes`)
      if (r.to !== 'space') assert.equal(g.panel?.title, menu(g.story).title)
    })
  })
})

test("Lucy's other kitchen scenes open their menus where Wade comes in: the table is only for the two missions", () => {
  const g = startFrom(hash(pathTo('a2_minto')), '')
  assert.equal(g.space, 'kitchen')
  assert.deepEqual(available(g), [])
  assert.equal(g.panel?.title, menu(g.story).title)
})

test("the ratchet counts Lucy's table as the sender of the hotel bar skipped and the cabinet refused, the runs the rest", () => {
  const ids = Object.keys(starts)
  const at = engineSenders(walk()).filter((s) => ids.some((id) => s.key.startsWith(`${id}:`)))
  const all = walk().flatMap((s) => s.offers.map((o) => o.key)).filter((k) => ids.some((id) => k.startsWith(`${id}:`)))
  assert.deepEqual([...new Set(at.map((s) => s.key))].sort(), [...new Set(all)].sort())
  const searched = (key: string): boolean => key.startsWith('theMajorsCabinet:') && key !== 'theMajorsCabinet:refused'
  const heard = (key: string): boolean => key.startsWith('theHotelBar:') && key !== 'theHotelBar:skipped'
  at.forEach((s) =>
    assert.deepEqual([s.space, s.spot], searched(s.key) ? ['eielson', DIAL_SPOT.id] : heard(s.key) ? ['hotelBar', SET] : ['kitchen', TABLE_SPOT.id], s.key),
  )
})

// The photo lab (a2_photos) is Lucy's ask before it is the base's: Wade comes into her kitchen, and at her table
// refusing is a conversation with her (docs/acts/act2-missions.md: a deliberate prompt, asked before the mission
// starts). Agreeing sends nothing and takes him to the lab's front door, where the counter asks when he goes in.
test("at a2_photos Wade comes into Lucy's kitchen first, with her table to walk to", () => {
  const arrived = startFrom(hash(pathTo('a2_photos')), '')
  assert.equal(arrived.story.scene, 'a2_photos')
  assert.equal(arrived.space, 'kitchen')
  assert.deepEqual(arrived.pos, SPAWN)
  assert.equal(arrived.panel, undefined, 'no menu until he walks to the table')
  assert.deepEqual(available(arrived), [TABLE_SPOT])
})

test("at a2_photos Lucy's table offers refusing and going, nothing else, and asking sends nothing", () => {
  const arrived = startFrom(hash(pathTo('a2_photos')), '')
  const asked = interact(atTable(arrived))
  assert.equal(asked.panel?.title, menu(arrived.story).title)
  assert.deepEqual(asked.panel?.buttons.map((b) => b.id), ['note:refuse', GO.id, 'close'])
  assert.deepEqual(asked.story, arrived.story)
})

test('refusing Lucy lands where the photo lab\'s refused note does, on the text build\'s path', () => {
  const arrived = startFrom(hash(pathTo('a2_photos')), '')
  const g = press(interact(atTable(arrived)), 'note:refuse')
  assert.deepEqual(g.story, sendMission(arrived.story, 'refused'))
  assert.deepEqual(g.story, textBuild(g), 'parity with the text build')
  assert.equal(g.story.scene, 'a2_hotel')
  assert.equal(g.space, 'kitchen', 'he is still in her kitchen, for the hotel bar')
})

test('going sends nothing and takes Wade to the photo lab\'s front door, the counter to walk to', () => {
  const arrived = startFrom(hash(pathTo('a2_photos')), '')
  const g = press(interact(atTable(arrived)), GO.id)
  assert.deepEqual(g.story, arrived.story)
  assert.deepEqual(g.path, arrived.path)
  assert.equal(g.space, 'eielson')
  const door = spawnAt('photoLab')
  assert.deepEqual(g.pos, vec(door.x, door.z))
  assert.equal(g.panel, undefined)
  assert.deepEqual(available(g), [LAB_SPOT])
})

test("the ratchet counts Lucy's table as the sender of the photo lab's refusal", () => {
  const at = engineSenders(walk()).filter((s) => s.key === 'thePhotoLab:refused')
  assert.ok(at.length > 0)
  at.forEach((s) => assert.deepEqual([s.space, s.spot], ['kitchen', TABLE_SPOT.id]))
})

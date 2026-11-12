import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place, send } from '../../text-game/src/story.ts'
import type { SceneId } from '../../text-game/src/types.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, label, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route } from './router.ts'
import { solids, spaces } from './levels.ts'
import { BACK_SPOT, DOOR_AT, DOOR_SPOT, FLOOR_SPOT, LISTEN_TIME, OUT_SPOT, SPAWN, hall, people, present } from './chiefsMeeting.ts'
import { SPAWN as KITCHEN_SPAWN } from './kitchen.ts'
import { engineSenders, walk } from './notesRatchet.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import type { Interactable } from './world.ts'
import { angleTo, distance, sub, vec } from './world.ts'

// The Tanana Chiefs meeting (chiefsMeeting.ts, #130): Wade comes into the hall, reads the scene, and what he does is
// where he stands and when he moves. Each way through is played headless and checked against the text build on its
// `--choices` path.

const DT = 1 / 30
const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

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

// Walks a route of points, then turns to the spot, as a player does.
const reach = (g: Game, route: readonly (readonly [number, number])[], spot: Interactable): Game => {
  const there = route.reduce((cur, [x, z]) => walkTo(cur, vec(x, z)), g)
  return tick(there, { ...still, view: angleTo(there.pos, spot) }, DT)
}

const holdFor = (g: Game, seconds: number): Game =>
  Array.from({ length: Math.ceil(seconds / DT) }).reduce<Game>((cur) => (cur.holding ? tick(cur, { ...still, hold: true }, DT) : cur), g)

// The aisle runs up the middle of the chairs from the back; the back wall and the door are along the south.
const toBack: readonly (readonly [number, number])[] = [[BACK_SPOT.x, BACK_SPOT.z + 0.1]]
const toFloor: readonly (readonly [number, number])[] = [[-1.5, 4.0], [FLOOR_SPOT.x, FLOOR_SPOT.z + 0.4]]
const toDoor: readonly (readonly [number, number])[] = [[DOOR_SPOT.x, DOOR_SPOT.z - 0.4]]

const arrived = startFrom(hash(pathTo('a2_chiefs')), '')
const inRoom = press(arrived, 'close')

test('a2_chiefs routes to the hall: Wade comes in at the door and the scene comes up, with nothing to choose on it', () => {
  assert.equal(place(arrived.story), 'communityHall')
  assert.deepEqual(route(arrived.story, 'story'), { to: 'space', space: 'hall' })
  assert.equal(arrived.space, 'hall')
  assert.deepEqual(arrived.pos, SPAWN)
  assert.equal(arrived.panel?.title, menu(arrived.story).title)
  assert.equal(arrived.panel?.text, menu(arrived.story).text, 'the scene text is the story\'s own')
  assert.deepEqual(arrived.panel?.buttons.map((b) => b.id), ['close'], 'no choice is a button: the choices are in the room')
  assert.deepEqual(available(inRoom).map((i) => i.id).sort(), [BACK_SPOT.id, DOOR_SPOT.id, FLOOR_SPOT.id].sort())
})

test("each of the meeting's spots is labeled by the story's own menu", () => {
  const options = menu(arrived.story).options
  ;[BACK_SPOT, FLOOR_SPOT, DOOR_SPOT].forEach((s) => {
    assert.ok(options.some((o) => o.note === s.note), `${s.note} is on the menu`)
    assert.equal(label(inRoom, s), options.find((o) => o.note === s.note)!.label)
  })
})

// Each way through the meeting, played by walking: the note it sends, the after scene in the hall, and out the door to
// Lucy's kitchen, each step the text build's own.
const ways = {
  listen: (g: Game) => holdFor(interact(reach(g, toBack, BACK_SPOT)), LISTEN_TIME + 0.5),
  offerHelp: (g: Game) => interact(reach(g, toFloor, FLOOR_SPOT)),
  slipOut: (g: Game) => interact(reach(g, toDoor, DOOR_SPOT)),
} as const

Object.entries(ways).forEach(([note, play]) => {
  test(`${note}: played in the room, it lands where the menu's note does, on the text build's path`, () => {
    const after = play(inRoom)
    assert.deepEqual(after.story, send(arrived.story, note))
    assert.deepEqual(after.story, textBuild(after), 'parity with the text build')
    assert.equal(after.space, 'hall', 'the scene after plays in the hall')
    assert.equal(after.panel?.text, menu(after.story).text)
    assert.deepEqual(after.panel?.buttons.map((b) => b.id), ['close'])

    const looking = press(after, 'close')
    assert.deepEqual(available(looking), [OUT_SPOT], 'after the meeting the way on is the door')
    const out = interact(reach(looking, [[DOOR_AT.x + 0.3, DOOR_AT.z - 0.5]], OUT_SPOT))
    assert.deepEqual(out.story, send(after.story, 'continue'))
    assert.deepEqual(out.story, textBuild(out), 'parity with the text build out the door')
    assert.equal(out.space, 'kitchen')
    assert.deepEqual(out.pos, KITCHEN_SPAWN)
  })
})

test('standing up puts Wade at the door afterward, where Lucy has her say outside', () => {
  const spoke = ways.offerHelp(inRoom)
  assert.deepEqual(spoke.pos, DOOR_AT)
})

test('staying is held: letting go before the speeches end sends nothing', () => {
  const held = interact(reach(inRoom, toBack, BACK_SPOT))
  assert.equal(held.holding?.note, BACK_SPOT.note)
  const partway = holdFor(held, LISTEN_TIME / 2)
  const letGo = tick(partway, still, DT)
  assert.equal(letGo.holding, undefined)
  assert.deepEqual(letGo.story, arrived.story)
})

test('the room is laid out for every way: from the door Wade reaches the back wall, the front and the door again', () => {
  ;[[toBack, BACK_SPOT], [toFloor, FLOOR_SPOT], [toDoor, DOOR_SPOT]].forEach(([r, spot]) => {
    const there = reach(inRoom, r as readonly (readonly [number, number])[], spot as Interactable)
    assert.equal(focus(there)?.id, (spot as Interactable).id)
  })
  // No spot sits inside anything solid, and none overlaps another of the meeting's.
  const boxes = solids(hall, arrived.story)
  ;[BACK_SPOT, FLOOR_SPOT, DOOR_SPOT].forEach((s) =>
    assert.ok(!boxes.some((b) => Math.abs(s.x - b.x) < b.w / 2 && Math.abs(s.z - b.z) < b.d / 2), `${s.id} is clear`),
  )
  assert.ok(distance(BACK_SPOT, DOOR_SPOT) > BACK_SPOT.r + DOOR_SPOT.r)
  assert.ok(distance(BACK_SPOT, FLOOR_SPOT) > BACK_SPOT.r + FLOOR_SPOT.r)
})

test('the people are each their own: no two share a look or a place, and every one is doing something', () => {
  const looks = people.map((p) => `${p.coat}|${p.hair}|${p.skin}|${p.height}`)
  assert.equal(new Set(looks).size, people.length, 'no copy-pasted crowd')
  const places = people.map((p) => `${p.at.x},${p.at.z}`)
  assert.equal(new Set(places).size, people.length)
  const delegates = people.filter((p) => p.id.startsWith('delegate'))
  assert.ok(delegates.length >= 8, 'delegates from up and down the rivers fill the room')
  assert.ok(new Set(delegates.map((d) => d.activity)).size > 1, 'the delegates are not all doing one thing')
  ;['elder', 'eli', 'recorder', 'lucy', 'ashby'].forEach((id) => assert.ok(people.some((p) => p.id === id), id))
  assert.deepEqual(spaces.hall.figures.map((f) => f.id), people.map((p) => p.id))
})

test('the speakers face the room, and Eli is on his feet', () => {
  const by = (id: string) => people.find((p) => p.id === id)!
  assert.equal(by('elder').doing, 'speaking')
  assert.equal(by('eli').activity, 'stand')
  assert.equal(by('recorder').doing, 'writing it down')
  assert.equal(by('ashby').doing, 'handing out cards')
})

test('Ashby is in the back while the meeting goes on, and gone after it', () => {
  const ashby = people.find((p) => p.id === 'ashby')!
  assert.ok(present(ashby, arrived.story))
  const after = ways.listen(inRoom)
  assert.ok(!present(ashby, after.story))
  assert.ok(!spaces.hall.figures.find((f) => f.id === 'ashby')!.when!(after.story))
})

test("the ratchet counts the hall's spots as the senders of the meeting's notes, and only there", () => {
  const stops = walk()
  const keys = new Set(stops.flatMap((s) => s.offers.map((o) => o.key)).filter((k) => k.startsWith('a2_chiefs')))
  assert.equal(keys.size, 5)
  const at = engineSenders(stops).filter((s) => keys.has(s.key))
  assert.deepEqual([...new Set(at.map((s) => s.key))].sort(), [...keys].sort())
  at.forEach((s) => assert.equal(s.space, 'hall'))
})

test('the hall says no word of oil', () => {
  const src = readFileSync(new URL('./chiefsMeeting.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /\boil\b/i)
})

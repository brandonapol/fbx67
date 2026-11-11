import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, place, sendMission } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, label, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route } from './router.ts'
import { LAB_SPOT, spawnAt } from './eielson.ts'
import { engineSenders, walk } from './notesRatchet.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import { angleTo, distance, sub, vec } from './world.ts'

// The photo lab on the base (docs/acts/act2-missions.md, section 1): the story's photo lab and records room route to
// the Eielson blockout. Wade comes in at the lab's front door, the way back to the records room is at the counter's
// open end, and the scene's own menu asks when he goes in; in the records room the drawers' menu comes up. Played
// headless and checked against the text build on each `--choices` path.

const DT = 1 / 30
const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

// a2_major's one choice from the Act 2 start lands on a2_photos.
const PHOTOS = [...ACT2_PATH.split(',').map(Number), 1]

const arrived = startFrom(hash(PHOTOS), '')

const walkTo = (g: Game, to: { x: number; z: number }): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(vec(to.x, to.z), cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// Walks from the front door to within reach of the counter's open end and turns to it, as a player does.
const atCounter = (): Game => {
  const near = walkTo(arrived, vec(161.4, 36.8))
  return tick(near, { ...still, view: angleTo(near.pos, LAB_SPOT) }, DT)
}

// Plays the photo lab by the menu's buttons in order, each a note the text build's menu offers there.
const play = (notes: readonly string[]): Game =>
  notes.reduce((g, note) => {
    assert.ok(g.panel?.buttons.some((b) => b.id === `note:${note}`), `${g.story.scene} offers ${note}`)
    const next = press(g, `note:${note}`)
    assert.deepEqual(next.story, textBuild(next), `parity with the text build at ${next.story.scene}`)
    return next
  }, interact(atCounter()))

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

test("at the counter the scene's own menu asks when Wade goes in, and asking sends nothing", () => {
  const asked = interact(atCounter())
  assert.equal(asked.panel?.title, menu(arrived.story).title)
  assert.deepEqual(asked.panel?.buttons.map((b) => b.id), [...menu(arrived.story).options.map((o) => `note:${o.note}`), 'close'])
  assert.deepEqual(asked.story, arrived.story)
})

test('in the records room the drawers come up, where its spawn is', () => {
  const g = play(['lunch'])
  assert.equal(g.story.scene, 'a2_photos_files')
  assert.equal(place(g.story), 'photoRecords')
  const room = spawnAt('photoRecords')
  assert.deepEqual(g.pos, vec(room.x, room.z))
  assert.equal(g.panel?.title, menu(g.story).title)
})

// Each mission note's text-build path from a2_photos, as the menu's notes in order.
const ways: Readonly<Record<string, readonly string[]>> = {
  'lunch.crossChecked': ['lunch', 'crossCheck'],
  'lunch.pulledAll': ['lunch', 'pullAll'],
  'key.crossChecked': ['afterLockup', 'crossCheck'],
  'key.pulledAll': ['afterLockup', 'pullAll'],
  refused: ['refuse'],
}

test('every way through the photo lab lands where its mission note does, on the text build\'s path', () => {
  const m = mission(arrived.story)
  assert.equal(m?.id, 'thePhotoLab')
  assert.deepEqual(Object.keys(ways).sort(), m!.endings.map((e) => e.note).sort())
  Object.entries(ways).forEach(([note, notes]) => {
    const g = play(notes)
    assert.equal(g.story.scene, 'a2_hotel', note)
    assert.equal(g.space, 'story', 'off the base, Lucy\'s kitchen plays over the story backdrop')
    assert.equal(g.panel?.title, menu(g.story).title)
    assert.deepEqual(g.story, sendMission(arrived.story, note), note)
  })
})

test('the ratchet counts the lab counter as the sender of every photo lab note, and only there', () => {
  const at = engineSenders(walk()).filter((s) => s.key.startsWith('thePhotoLab:'))
  assert.deepEqual([...new Set(at.map((s) => s.key))].sort(), Object.keys(ways).map((n) => `thePhotoLab:${n}`).sort())
  at.forEach((s) => assert.deepEqual([s.space, s.spot], ['eielson', LAB_SPOT.id]))
})

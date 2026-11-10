import { test } from 'node:test'
import assert from 'node:assert/strict'
import { goal, menu, place } from '../../text-game/src/story.ts'
import { prologueThreads, prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import type { Game } from './prologue.ts'
import { TYPE_RATE, available, focus, interact, panelText, press, shows, start, tick, typing } from './prologue.ts'
import { DT, HALL, talk, toBed, toHall, toRoom, typeOut, walk, walkLeg, writeLetter } from './drive.ts'
import { spaceFor } from './router.ts'
import { boarding, room, solids } from './levels.ts'
import { doors, placements, spawnAt, toWorld } from './downtown.ts'
import { blocked, distance } from './world.ts'
import { holds } from './soundscape.ts'

const ids = (g: Game): readonly string[] => available(g).map((i) => i.id).sort()

const hall = (): Game => toHall(talk(start(), 'texas'))

const atLetter = (): Game => interact(walk(toRoom(talk(start(), 'texas')), [[0.6, -1.0]]))

test('the boarding house door opens on the hall inside the front door on Third, and no story note is sent', () => {
  const g = hall()
  assert.equal(g.space, 'boarding')
  assert.equal(g.story.scene, 'p_letter')
  assert.equal(g.panel, undefined)
  const door = toWorld(placements.find((p) => p.space === 'boarding')!, g.pos)
  assert.ok(distance(door, spawnAt('boardingHouse')) < 3.5, `inside the door at ${door.x},${door.z}`)
  assert.deepEqual(ids(g), ['landlady', 'stair'])
  assert.equal(spaceFor('Prologue', 'owensRoom'), 'room', 'the story place is still the room; the hall is on the way')
})

test('the landlady greets Owen with her line for the night, and that night tells of the man who asked which room was his', () => {
  const g = interact(walk(hall(), [[0, 3.4], [-2.4, 3.4]]))
  assert.equal(focus({ ...g, panel: undefined })?.id, 'landlady')
  const her = prologueTown.find((p) => p.id === 'landlady')!
  const night = her.lines.greet!.find((b) => b.id === 'late')!
  const thread = prologueThreads.find((t) => t.id === 'whichRoom')!
  assert.equal(g.panel?.kind, 'talk')
  assert.equal(g.panel?.title, 'The landlady')
  const text = g.panel!.text
  assert.ok(text.startsWith(night.lines[0]!.text), text)
  thread.lines.forEach((l) => assert.ok(text.includes(l.text), `missing: ${l.text}`))
  assert.ok(text.includes('The boarder on the porch: You tell him?'))
  assert.equal(g.path.length, hall().path.length, 'talking sends no note')
  assert.equal(press(g, 'close').panel, undefined)
})

test('the stair takes Owen up to his room, where the desk answers and the bed waits for the letter', () => {
  const up = interact(walk(hall(), HALL))
  assert.equal(up.space, 'room')
  assert.equal(up.story.scene, 'p_letter')
  assert.deepEqual(ids(up), ['desk', 'maps', 'reel'])
})

test("the letter types out p_letter's text verbatim, then folds and goes by the door", () => {
  const g = atLetter()
  const m = menu(g.story)
  assert.equal(g.panel?.kind, 'letter')
  assert.equal(g.panel?.title, 'Owen: A Letter to Lucy')
  assert.equal(g.panel?.text, m.text)
  assert.equal(panelText(g), '')
  assert.ok(typing(g))
  const second = Array.from({ length: 30 }).reduce<Game>((acc) => tick(acc, { dir: { x: 0, z: 0 }, hold: false }, DT), g)
  assert.equal(panelText(second), m.text.slice(0, Math.floor(TYPE_RATE * 30 * DT)))
  assert.deepEqual(second.panel?.buttons.map((b) => b.id), ['finish'])
  const done = typeOut(g)
  assert.equal(panelText(done), m.text)
  assert.ok(!typing(done))
  assert.deepEqual(done.panel?.buttons.map((b) => b.id), ['fold'])
  assert.equal(panelText(press(g, 'finish')), m.text, 'finish skips to the end')
  const folded = press(done, 'fold')
  assert.equal(folded.panel, undefined)
  assert.equal(folded.letter, 'folded')
  assert.equal(folded.story.scene, 'p_letter', 'folding sends no note')
  assert.deepEqual(ids(folded), ['bed'])
})

test('the typewriter sounds only while the letter is typing, and the folded letter shows by the door', () => {
  const g = atLetter()
  assert.ok(holds('writing', g))
  assert.ok(!holds('writing', typeOut(g)))
  const sheet = room.props.find((p) => p.while === 'unfolded')!
  const byDoor = room.props.find((p) => p.while === 'folded')!
  assert.ok(shows(g, sheet.while) && !shows(g, byDoor.while))
  const folded = press(typeOut(g), 'fold')
  assert.ok(!shows(folded, sheet.while) && shows(folded, byDoor.while))
})

test('no hiding note is sent in the boarding house or the room: only sleep, and only from the bed', () => {
  const room0 = toRoom(talk(start(), 'texas'))
  const folded = writeLetter(room0)
  assert.equal(folded.path.length, room0.path.length)
  const morning = toBed(folded)
  assert.equal(morning.path.length, room0.path.length + 1)
  assert.equal(menu(room0.story).options.find((o) => o.n === morning.path.at(-1))?.note, 'sleep')
  assert.equal(morning.story.owenCache, undefined)
})

test('the morning starts at the boarding house door on Third, with the goal pointing at the float dock', () => {
  const morning = toBed(writeLetter(toRoom(talk(start(), 'texas'))))
  assert.equal(morning.space, 'downtown')
  assert.equal(morning.panel, undefined)
  assert.equal(morning.letter, undefined)
  const s = spawnAt('boardingHouse')
  assert.ok(distance(morning.pos, s) < 1e-9)
  assert.equal(place(morning.story), 'floatDock')
  assert.ok(goal(morning.story), 'the morning has a goal')
  const dock = doors.find((d) => d.place === place(morning.story))!
  assert.equal(dock.id, 'floatDock')
  assert.equal(walkLeg(morning).panel?.title, 'Owen: The Float Dock')
})

test('the hall, the stair foot and every spot in both rooms that is not a person stand clear of the walls', () => {
  ;[boarding, room].forEach((s) => {
    ;[s.spawn, ...s.spots.filter((p) => !s.figures.some((f) => f.id === p.id))].forEach((p) => assert.equal(blocked(p, solids(s)), false, `${s.id}: ${p.x},${p.z}`))
  })
})

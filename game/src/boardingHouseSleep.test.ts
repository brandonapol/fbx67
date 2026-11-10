import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu, goal, place } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { focus, interact, tick, available } from './prologue.ts'
import { start } from './prologue.ts'
import { DT, talk, toRoom, walk, writeLetter } from './drive.ts'
import { SLEEP_FADE, SLEEP_TIME, sleepCard, sleepFade } from './boardingHouseSleep.ts'
import { mapsPanel } from './room.ts'
import { spawnAt } from './downtown.ts'
import { distance } from './world.ts'

const folded = (): Game => writeLetter(toRoom(talk(start(), 'texas')))
const idle = { dir: { x: 0, z: 0 }, hold: false }

test('the maps and the reel-to-reel are reachable in the room, and neither sends a note', () => {
  const room = toRoom(talk(start(), 'texas'))
  const maps = interact(walk(room, [[-0.65, -1.7]]))
  assert.equal(focus({ ...maps, panel: undefined })?.id, 'maps')
  assert.equal(maps.panel, mapsPanel)
  assert.equal(maps.path.length, room.path.length)
  const reel = interact(walk(room, [[2.3, -1.3]]))
  assert.equal(reel.panel?.title, 'The reel-to-reel')
  assert.equal(reel.path.length, room.path.length)
  assert.ok(!available(folded()).some((i) => i.id === 'maps' || i.id === 'reel'), 'put away once the letter is folded')
})

test('lying down fades to black with the date card, and only at the end does the morning begin at the door', () => {
  const g = folded()
  const lying = interact(walk(g, [[-0.6, 0.6]]))
  assert.equal(lying.sleeping, 0)
  assert.equal(lying.space, 'room')
  assert.equal(lying.path.length, g.path.length, 'no note yet')
  assert.equal(sleepCard(lying), undefined, 'no card until the screen is black')
  const mid = Array.from({ length: Math.ceil((SLEEP_FADE + 0.3) / DT) }).reduce<Game>((a) => tick(a, idle, DT), lying)
  assert.equal(sleepFade(mid), 1)
  assert.equal(sleepCard(mid), 'Saturday, July 15, 1967. 7:30 a.m.')
  assert.equal(mid.space, 'room')
  const morning = Array.from({ length: Math.ceil(SLEEP_TIME / DT) + 2 }).reduce<Game>((a) => tick(a, idle, DT), lying)
  assert.equal(morning.sleeping, undefined)
  assert.equal(morning.space, 'downtown')
  assert.equal(morning.path.length, g.path.length + 1)
  assert.equal(menu(morning.story).title === menu(g.story).title, false)
  assert.ok(distance(morning.pos, spawnAt('boardingHouse')) < 1e-9)
  assert.equal(place(morning.story), 'floatDock')
  assert.ok(goal(morning.story))
  assert.equal(sleepFade(morning), 0)
})

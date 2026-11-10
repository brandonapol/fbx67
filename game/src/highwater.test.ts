import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu } from '../../text-game/src/story.ts'
import { present, propsIn, solids, spaces, standAt } from './levels.ts'
import { HOUSE_WATER, PORCH, WALKWAY, WATER_Y, highWater, indoors } from './highwater.ts'
import { available, ended, focus, inWorld, playerBody, press, resume, start, tick } from './prologue.ts'
import { DT, downstairs, rideOut, talk, toHall, toRoom, toSkiff, wadeOut } from './drive.ts'
import { RIDE_TIME, rideAt } from './skiff.ts'
import { bodies } from './cast.ts'
import { dockProps } from './floatDock.ts'
import { blocked, vec } from './world.ts'

// The text build's path to the prologue's last scene, p_end, and through it: `node src/cli.ts --choices 1,1,1,1,1,1`.
const TO_END = [1, 1, 1, 1, 1] as const
const THROUGH = [...TO_END, 1]

const atEnd = () => resume(replay(TO_END).at(-1)!, TO_END)

test('the flooded street is the July town with the flood laid over it, not a level of its own', () => {
  // The July town without the float-dock morning's dressing: in August the plane and Curly are gone (floatDock.ts).
  const town = spaces.downtown.props.filter((p) => !dockProps.includes(p))
  const flood = spaces.flood.props
  assert.deepEqual(flood.slice(0, town.length), town, 'every July piece, in order')
  assert.deepEqual(flood.slice(town.length), highWater, 'and the high-water layer after them')
  assert.deepEqual([spaces.flood.size, spaces.flood.center], [spaces.downtown.size, spaces.downtown.center])
  // The layer moves no wall: what it adds that is solid is only the water off the walkway's edges, at ankle height.
  highWater.filter((p) => p.solid).forEach((p) => assert.ok(p.h <= 0.01, `a solid ${p.color} in the flood layer`))
})

test('Owen stands on the porch and the walkway above the water, and the water stops him at their edges', () => {
  assert.ok(standAt(spaces.flood, spaces.flood.spawn) > WATER_Y, 'the porch stands clear of the water')
  assert.ok(standAt(spaces.flood, vec(150, 97.5)) > WATER_Y, 'so does the walkway along the block')
  assert.equal(standAt(spaces.flood, vec(135, 104)), 0)
  const walls = solids(spaces.flood)
  assert.equal(blocked(vec(150, 97.5), walls), false)
  assert.ok(blocked(vec(135.2, 99.6), walls), 'the street is water')
  assert.ok(blocked(vec(WALKWAY[0] - 0.2, 97.5), walls) && blocked(vec(WALKWAY[1] + 0.2, 97.5), walls), 'so are both ends')
  assert.ok(PORCH[0] > WALKWAY[0] && PORCH[1] < WALKWAY[1])
})

test('in August the house is flooded: knee-deep water downstairs, rain on his window, the landlady gone upstairs', () => {
  const g = atEnd()
  assert.equal(propsIn(spaces.boarding, 'flood').at(-indoors.boarding!.length)?.h, HOUSE_WATER)
  assert.deepEqual(propsIn(spaces.room, 'flood').slice(spaces.room.props.length), indoors.room)
  assert.deepEqual(propsIn(spaces.boarding, 'summer'), spaces.boarding.props, 'July is dry')
  const here = spaces.boarding.figures.filter((f) => present(f, g.story)).map((f) => f.id)
  assert.deepEqual(here, [])
})

test('p_end plays from his room, down the stair and out the front door to the skiff', () => {
  const room = atEnd()
  assert.equal(room.story.scene, 'p_end')
  assert.deepEqual([room.space, room.panel], ['room', undefined])
  assert.deepEqual(available(room).map((i) => i.id), ['downstairs'], 'no letter to write and no bed to sleep in')
  const hall = downstairs(room)
  assert.equal(hall.space, 'boarding')
  assert.deepEqual(available(hall).map((i) => i.id), ['front'])
  const street = wadeOut(hall)
  assert.equal(street.space, 'flood')
  assert.equal(street.story.scene, 'p_end', 'nothing is sent on the way out')
  assert.equal(street.path.length, TO_END.length)
  const skiff = toSkiff(street)
  assert.deepEqual(skiff.panel?.buttons.map((b) => b.id), ['note:continue'])
  assert.equal(skiff.panel?.title, menu(skiff.story).title)
})

test('climbing in sends continue: the same state as --choices 1,1,1,1,1,1, then the ride, then the end card', () => {
  const skiff = toSkiff(wadeOut(downstairs(atEnd())))
  const aboard = press(skiff, 'note:continue')
  assert.deepEqual(aboard.path, THROUGH)
  assert.deepEqual(aboard.story, replay(THROUGH).at(-1))
  assert.equal(aboard.story.scene, 'a1_flood')
  assert.equal(aboard.panel, undefined, 'no end card yet: the ride plays first')
  assert.deepEqual(aboard.pos, rideAt(0).seat)
  assert.ok(inWorld(aboard), 'Owen sits in the stern')
  assert.equal(playerBody(aboard), bodies.owen)
  assert.equal(focus(aboard), undefined, 'nothing to do on the ride but look')

  const halfway = Array.from({ length: Math.round(RIDE_TIME / 2 / DT) }).reduce<typeof aboard>((g) => tick(g, { dir: vec(1, 0), hold: true }, DT), aboard)
  assert.equal(halfway.panel, undefined)
  assert.ok(Math.abs(halfway.pos.x - rideAt(halfway.ride).seat.x) < 1e-9, 'the stick does not steer the skiff')
  assert.deepEqual(halfway.story, aboard.story, 'the ride sends nothing')

  const end = rideOut(aboard)
  assert.ok(ended(end))
  assert.ok((end.ride ?? 0) >= RIDE_TIME)
  assert.deepEqual(end.story, replay(THROUGH).at(-1))
  assert.equal(inWorld(end), false, 'nobody stands in the prologue flood under the end card')
  assert.equal(press(end, 'continue').space, 'line')
  assert.equal(press(end, 'continue').ride, undefined)
})

test('in July the room and the hall keep their July ways and never offer the way out through the flood', () => {
  const hall = toHall(talk(start(), 'texas'))
  assert.ok(!available(hall).some((i) => i.id === 'front'))
  assert.ok(available(hall).some((i) => i.id === 'stair'))
  const room = toRoom(talk(start(), 'texas'))
  assert.deepEqual(available(room).map((i) => i.id), ['desk', 'maps', 'reel'])
})

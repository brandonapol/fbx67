import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu, send } from '../../text-game/src/story.ts'
import { prologueThings } from '../../text-game/src/ambient/prologueThings.ts'
import type { Game } from './prologue.ts'
import { press, start } from './prologue.ts'
import { talk, toBed, toRoom, writeLetter } from './drive.ts'
import { room, solids } from './levels.ts'
import { blocked, pick } from './world.ts'
import { dateCard, mapSheet, roomThings, roomThingsOpen, sheet, useRoom } from './room.ts'

const night = (): Game => toRoom(talk(start(), 'texas'))

test("the tape plays the reel-to-reel's own line from the story layer, and sends no note", () => {
  const g = night()
  const played = useRoom(g, 'reel')!
  const bit = prologueThings.find((t) => t.id === 'reelToReel')!.lines.use![0]!
  const line = bit.lines.map((l) => l.text).join(' ')
  assert.ok(bit.lines.some((l) => l.by === 'owen'), 'the tape carries Owen dictating')
  assert.equal(played.panel?.kind, 'talk')
  assert.equal(played.panel?.title, 'The reel-to-reel')
  assert.equal(played.panel?.text, line)
  assert.deepEqual(played.story, g.story)
  assert.deepEqual(played.path, g.path)
  assert.equal(press(played, 'close').panel, undefined)
})

test('the maps close-up draws the route north and circles the Chatanika parcel, with no prose', () => {
  const g = useRoom(night(), 'maps')!
  assert.equal(g.panel?.title, 'The survey maps')
  assert.equal(g.panel?.text, '')
  assert.deepEqual(g.story, night().story)
  const svg = mapSheet()
  assert.match(svg, /data-mark="route"/)
  assert.match(svg, /data-mark="parcel"/)
  assert.match(svg, /data-river="Chatanika"/)
  const [px, py] = sheet.parcel.at
  const chatanika = sheet.rivers.Chatanika!
  const near = Math.min(...chatanika.map(([x, y]) => Math.hypot(x - px, y - py)))
  assert.ok(near <= sheet.parcel.r, 'the parcel sits on the Chatanika')
})

test('the maps and the tape are there only on the night in the room, and only in the room', () => {
  const g = night()
  assert.ok(roomThingsOpen(g.story))
  assert.equal(useRoom({ ...g, space: 'boarding' }, 'reel'), undefined)
  assert.equal(useRoom(g, 'desk'), undefined, 'the desk stays the letter')
  const morning = toBed(writeLetter(g))
  assert.ok(!roomThingsOpen(morning.story))
  assert.equal(useRoom({ ...morning, space: 'room' }, 'maps'), undefined)
})

test('each thing is reachable: its spot stands clear of the room, and facing it from the spot picks it', () => {
  roomThings.forEach((t) => {
    assert.equal(blocked(t, solids(room)), false, `${t.id} at ${t.x},${t.z}`)
    const facing = Math.PI
    assert.equal(pick({ x: t.x, z: t.z + 0.4 }, facing, facing, [...room.spots, ...roomThings])?.id, t.id, t.id)
  })
})

test("sleeping puts the next morning's date over the fade, and no other step does", () => {
  const g = night()
  const morning = send(g.story, 'sleep')
  assert.equal(dateCard(g.story, morning), 'Saturday, July 15, 1967. 7:30 a.m.')
  assert.equal(dateCard(start().story, g.story), undefined)
  assert.equal(dateCard(g.story, g.story), undefined)
  assert.equal(menu(g.story).options.find((o) => o.note === 'sleep')?.note, 'sleep')
})

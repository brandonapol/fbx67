import { test } from 'node:test'
import assert from 'node:assert/strict'
import { D, ENDS_AT, OPPONENT, PLAYER, W, WARN_AT, counter, room, stove, testFight, walls } from './fightSpace.ts'
import type { Box } from './world.ts'
import { blocked } from './world.ts'

const inside = (b: Box): boolean => b.x - b.w / 2 >= -W / 2 && b.x + b.w / 2 <= W / 2 && b.z - b.d / 2 >= -D / 2 && b.z + b.d / 2 <= D / 2

test('four walls close the room on every side', () => {
  assert.equal(walls.length, 4)
  assert.ok(walls.some((w) => w.z < 0 && w.w === W), 'north')
  assert.ok(walls.some((w) => w.z > 0 && w.w === W), 'south')
  assert.ok(walls.some((w) => w.x < 0 && w.d === D), 'west')
  assert.ok(walls.some((w) => w.x > 0 && w.d === D), 'east')
})

test('the counter and the stove stand inside the walls and do not overlap each other', () => {
  assert.ok(inside(counter))
  assert.ok(inside(stove))
  const apart = Math.abs(counter.x - stove.x) >= (counter.w + stove.w) / 2 || Math.abs(counter.z - stove.z) >= (counter.d + stove.d) / 2
  assert.ok(apart)
  assert.deepEqual(room.counters, [counter])
  assert.equal(room.stove, stove)
})

test('the clock warns before it ends', () => {
  const f = testFight()
  assert.equal(f.warnAt, WARN_AT)
  assert.equal(f.endsAt, ENDS_AT)
  assert.ok(f.warnAt < f.endsAt)
  assert.equal(f.t, 0)
  assert.equal(f.over, false)
})

test('the fight starts with the player against one man, both on open floor facing each other', () => {
  const f = testFight()
  assert.equal(f.player, PLAYER)
  assert.deepEqual(f.fighters.map((x) => [x.id, x.side]), [[PLAYER, 'us'], [OPPONENT, 'them']])
  const solid = [...walls, counter, stove]
  f.fighters.forEach((x) => assert.equal(blocked(x.pos, solid), false, x.id))
  const [me, him] = f.fighters
  assert.ok(me!.pos.z > him!.pos.z, 'the player starts south of the opponent, who faces south (0)')
  assert.equal(him!.facing, 0)
  assert.equal(me!.facing, Math.PI)
})

test('the things are one rack on the west wall and two bottles on the counter, all unique', () => {
  const f = testFight()
  assert.deepEqual(f.things.map((t) => t.kind).sort(), ['bottle', 'bottle', 'rack'])
  assert.equal(new Set(f.things.map((t) => t.id)).size, 3)
  f.things.filter((t) => t.kind === 'bottle').forEach((b) => {
    assert.equal(b.pos.z, counter.z)
    assert.ok(Math.abs(b.pos.x - counter.x) <= counter.w / 2, 'on the counter')
  })
  const rack = f.things.find((t) => t.kind === 'rack')!
  assert.ok(rack.pos.x < -W / 2 + 1)
})

test('each start is a fresh fight', () => {
  assert.notEqual(testFight(), testFight())
  assert.deepEqual(testFight(), testFight())
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { slots } from './ambient.ts'
import { spaces } from './levels.ts'
import { CARD_TABLE, ORDER_STOOL, dressing, doingAt, patrons, pieces } from './silverPan.ts'
import { poses } from './ambient.ts'
import { hits, vec } from './world.ts'

const at = (scene: string): State => ({ ...initialState, scene: scene as State['scene'] })
const barNight = at('p_bar')
const seeds = Array.from({ length: 24 }, (_, i) => i + 1)
const solid = [...spaces.bar.props, ...dressing].filter((p) => p.solid).map((p) => p.box)

test('the bar is dressed with everything on the list', () => {
  const list = [
    'bar', 'brassRail', 'backBar', 'mirror', 'bottles', 'till', 'goldPans', 'mooseRack', 'photos', 'neon', 'tinSigns',
    'jukebox', 'poolTable', 'hangingLamp', 'cardTable', 'dartboard', 'oilStove', 'coatHooks', 'payPhone', 'floor', 'windows',
  ]
  for (const id of list) assert.ok(pieces[id]?.length, `${id} is in the room`)
  assert.ok(pieces.neon.every((p) => p.glow) && pieces.windows.some((p) => p.glow), 'the neon and the windows give light')
  for (const p of dressing) {
    const { w, d } = spaces.bar.size
    assert.ok(Math.abs(p.box.x) <= w / 2 && Math.abs(p.box.z) <= d / 2, `inside the room at ${p.box.x}, ${p.box.z}`)
    assert.ok(p.h >= 0.02, 'tall enough to be drawn')
  }
})

test('the dressing leaves every standing place clear: the door, Hank, Wade, Curly, the stool, the jukebox, the cards', () => {
  // Where the drive and the bar's interactions stand Owen: the spawn, Hank, the talk at Wade's table, the stool, the
  // jukebox, the card table, the door.
  const clear = [spaces.bar.spawn, vec(-1.5, -2.2), vec(1.6, 3.2), ORDER_STOOL, vec(4.6, -1.4), vec(-3.2, 3.0), vec(0, 4.2)]
  for (const p of clear) assert.deepEqual(solid.filter((b) => hits(p, b)), [], `${p.x}, ${p.z}`)
})

test('every slot in the bar is clear of the dressing', () => {
  for (const s of slots.filter((sl) => sl.space === 'bar')) assert.deepEqual(solid.filter((b) => hits(s.at, b, 0.3)), [], s.id)
})

test('at 11 pm the bar holds 10 to 15 people, each doing something, for any seed', () => {
  for (const seed of seeds) {
    const placed = patrons(barNight, seed)
    const all = placed.length + spaces.bar.figures.length
    assert.ok(all >= 10 && all <= 15, `${all} people with seed ${seed}`)
    const doing = poses(barNight, seed, 0).filter((p) => p.space === 'bar').map((p) => [p.who, doingAt(p.slot)] as const)
    const count = (d: string) => doing.filter(([, x]) => x === d).length
    assert.equal(count('pool'), 2, 'two playing pool')
    assert.equal(count('booth'), 2, 'two in the booth')
    assert.equal(count('jukebox'), 1, 'an airman at the jukebox')
    assert.equal(count('tending'), 1, 'the second bartender at the taps')
    assert.ok(count('cards') >= 2, 'a card game')
    assert.deepEqual(doing.filter(([, x]) => x === 'asleep').map(([w]) => w), ['miner'], 'the old-timer asleep at the end of the bar')
  }
})

test('the card game is at the card table, and the patrons look like themselves', () => {
  const players = poses(barNight, 1, 0).filter((p) => doingAt(p.slot) === 'cards')
  for (const p of players) assert.ok(Math.hypot(p.at.x - CARD_TABLE.x, p.at.z - CARD_TABLE.z) < 1.2, p.who)
  const figs = patrons(barNight, 1)
  assert.equal(new Set(figs.map((f) => f.coat + f.hair)).size, figs.length, 'no two patrons dressed alike')
  assert.deepEqual(patrons(at('p_camp'), 1), [], 'nobody from the bar at the camp')
})

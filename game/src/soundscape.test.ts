import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUSES } from './mixer.ts'
import type { Soundscape } from './soundscape.ts'
import {
  BOATS_AT,
  CREEK_Z,
  JUKEBOX_AT,
  LINE_AT,
  PLUGGED_AT,
  RACK_AT,
  RIVER_Z,
  STOVE_AT,
  act1Soundscapes,
  act2Soundscapes,
  act3Soundscapes,
  arrivals,
  holds,
  soundscapes,
  sourceAt,
  walked,
} from './soundscape.ts'
import { LINE_Z } from './searchEli.ts'
import type { Game } from './prologue.ts'
import { start } from './prologue.ts'
import { vec } from './world.ts'
import { bar as barSpace } from './levels.ts'
import { JUKEBOX, pieces } from './silverPan.ts'

const beds: readonly (readonly [string, Soundscape])[] = [
  ...Object.entries(soundscapes),
  ...Object.entries(act1Soundscapes).map(([k, v]) => [`act1.${k}`, v] as const),
  ...Object.entries(act2Soundscapes).map(([k, v]) => [`act2.${k}`, v] as const),
  ...Object.entries(act3Soundscapes).map(([k, v]) => [`act3.${k}`, v] as const),
]

test('every layer is on a real bus with a positive, finite gain; wobbles stay under full depth', () => {
  beds.forEach(([name, s]) =>
    s.layers.forEach((l, i) => {
      assert.ok(BUSES.includes(l.bus), `${name}[${i}] bus ${l.bus}`)
      assert.ok(Number.isFinite(l.gain) && l.gain > 0, `${name}[${i}] gain ${l.gain}`)
      if (l.kind !== 'noise') return
      assert.ok(l.freq > 20 && l.freq < 20000, `${name}[${i}] freq ${l.freq}`)
      if (l.q !== undefined) assert.ok(l.q > 0, `${name}[${i}] q`)
      if (l.wobble) assert.ok(l.wobble.rate > 0 && l.wobble.depth > 0 && l.wobble.depth < 1, `${name}[${i}] wobble`)
      if (l.alongX) assert.ok(l.at, `${name}[${i}] runs along x from a point`)
    }),
  )
})

test('every event fires on a real bus within a positive interval, low before high', () => {
  beds.forEach(([name, s]) =>
    s.events.forEach((e) => {
      assert.ok(BUSES.includes(e.bus), `${name} ${e.spot} bus`)
      const [lo, hi] = e.every
      assert.ok(lo > 0 && lo <= hi, `${name} ${e.spot} every [${lo}, ${hi}]`)
      if (e.spread !== undefined) assert.ok(e.spread > 0, `${name} ${e.spot} spread`)
    }),
  )
})

test('a ground temperature, where set, is finite, and every surface region has area', () => {
  beds.forEach(([name, s]) => {
    if (s.ground.tempF !== undefined) assert.ok(Number.isFinite(s.ground.tempF), name)
    s.ground.regions.forEach((r) => assert.ok(r.box.w > 0 && r.box.d > 0, `${name} region`))
  })
})

test('the act tables share their beds with the space table', () => {
  assert.equal(soundscapes.line, act1Soundscapes.line)
  assert.equal(soundscapes.jail, act1Soundscapes.cell)
  assert.equal(soundscapes.helpTent, act1Soundscapes.hospital)
})

test('the story space is silent and the room announces itself with a door', () => {
  assert.equal(soundscapes.story.layers.length, 0)
  assert.equal(soundscapes.story.events.length, 0)
  assert.equal(soundscapes.room.arrival, 'door')
  assert.equal(soundscapes.bar.arrival, undefined)
})

test('per-space placement: the creek and the line follow the map, a plugged car and a boat per entry', () => {
  const creek = soundscapes.camp.layers.filter((l) => l.kind === 'recording' && l.clip === 'creek')
  assert.equal(creek.length, 1)
  creek.forEach((l) => assert.ok(l.kind === 'recording' && l.alongX && l.at?.z === CREEK_Z))
  assert.equal(LINE_AT.z, LINE_Z)
  assert.ok(RIVER_Z < LINE_Z, 'the river runs north of the line')
  assert.equal(act1Soundscapes.line.layers.filter((l) => l.kind === 'outboard').length, BOATS_AT.length)
  assert.equal(act2Soundscapes.town.layers.filter((l) => l.kind === 'idle').length, PLUGGED_AT.length)
  const rpms = act2Soundscapes.town.layers.flatMap((l) => (l.kind === 'idle' ? [l.rpm] : []))
  assert.equal(new Set(rpms).size, rpms.length, 'no two idling cars beat in unison')
})

test('sourceAt slides an along-x source with the listener inside the half width, and pins a point source', () => {
  const at = vec(0, 9)
  assert.deepEqual(sourceAt(at, true, vec(3, 0), 10), vec(3, 9))
  assert.deepEqual(sourceAt(at, true, vec(40, 0), 10), vec(10, 9))
  assert.deepEqual(sourceAt(at, true, vec(-40, 0), 10), vec(-10, 9))
  assert.deepEqual(sourceAt(at, false, vec(3, 0), 10), at)
  assert.deepEqual(sourceAt(at, undefined, vec(3, 0), 10), at)
})

test('walked is the distance in one space and nothing across a change of space or from no prior frame', () => {
  const g = start()
  const moved: Game = { ...g, pos: vec(g.pos.x + 3, g.pos.z + 4) }
  assert.equal(walked(g, moved), 5)
  assert.equal(walked(undefined, moved), 0)
  assert.equal(walked(g, { ...moved, space: 'room' }), 0)
})

test('arrivals sound once on entering a space that has one, and never on staying', () => {
  const g = start()
  assert.deepEqual(arrivals(undefined, { ...g, space: 'room' }), [])
  assert.deepEqual(arrivals(g, { ...g, space: 'room' }), ['door'])
  assert.deepEqual(arrivals({ ...g, space: 'room' }, { ...g, space: 'room' }), [])
  assert.deepEqual(arrivals({ ...g, space: 'room' }, { ...g, space: 'bar' }), [])
})

test('an event with no condition always holds; writing needs an unfinished letter', () => {
  const g = start()
  assert.equal(holds(undefined, g), true)
  assert.equal(holds('writing', g), false)
  const letter = { kind: 'letter', text: 'Dear Ma', buttons: [] } as unknown as Game['panel']
  assert.equal(holds('writing', { ...g, panel: letter, typed: 3 }), true)
  assert.equal(holds('writing', { ...g, panel: letter, typed: 7 }), false)
  assert.equal(holds('refueling', { ...g, space: 'bar' }), false)
})

test('the Pan: every sound point is inside its walls, and the stove, rack and jukebox sound where they stand', () => {
  const { w, d } = barSpace.size
  const inner = 0.15
  const pan = [soundscapes.bar, act1Soundscapes.barfight]
  pan.forEach((s) =>
    [...s.layers, ...s.events].forEach((x) => {
      const at = 'at' in x ? x.at : undefined
      if (!at) return
      assert.ok(Math.abs(at.x) < w / 2 - inner && Math.abs(at.z) < d / 2 - inner, `(${at.x}, ${at.z}) is outside the walls`)
    }),
  )
  const near = (a: { x: number; z: number }, b: { x: number; z: number }, label: string) =>
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) <= 2, `${label} at (${a.x}, ${a.z}) is not by the prop at (${b.x}, ${b.z})`)
  near(STOVE_AT, pieces.oilStove![0]!.box, 'stove')
  near(RACK_AT, pieces.mooseRack![0]!.box, 'rack')
  near(JUKEBOX_AT, JUKEBOX, 'jukebox')
  assert.deepEqual(soundscapes.bar.events.find((e) => e.spot === 'crackle')?.at, STOVE_AT)
})

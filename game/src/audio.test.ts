import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Volumes } from './mixer.ts'
import { DEFAULT_VOLUMES, DUCK, busGain, busGains, parseVolumes, serializeVolumes, sliderGain, withVolume } from './mixer.ts'
import { STRIDE, pace, standing, surfaceAt } from './footsteps.ts'
import { CURLY_PERIOD, WORK, spaces } from './levels.ts'
import { interact, press, start, still, tick } from './prologue.ts'
import { DT, routes, talk, walk } from './drive.ts'
import { arrivals, ducked, holds, refueling, soundscapes, sourceAt, walked } from './soundscape.ts'
import { beatAt, midiHz, noiseSamples } from './synth.ts'
import { vec } from './world.ts'

const full: Volumes = { ambience: 1, sfx: 1, voice: 1, music: 1 }

test('a slider maps to gain on a square law and clamps out-of-range values', () => {
  assert.equal(sliderGain(0), 0)
  assert.equal(sliderGain(1), 1)
  assert.equal(sliderGain(0.5), 0.25)
  assert.equal(sliderGain(2), 1)
  assert.equal(sliderGain(-1), 0)
  assert.equal(sliderGain(Number.NaN), 0)
})

test('a story panel ducks music and walla and leaves ambience and effects alone', () => {
  const open = busGains(full, true)
  assert.equal(open.music, DUCK)
  assert.equal(open.voice, DUCK)
  assert.equal(open.ambience, 1)
  assert.equal(open.sfx, 1)
  assert.deepEqual(busGains(full, false), full)
  assert.equal(busGain({ ...full, music: 0.5 }, 'music', true), 0.25 * DUCK)
})

test('volumes round-trip through storage and bad saves fall back per bus', () => {
  const v = withVolume(withVolume(DEFAULT_VOLUMES, 'music', 0.1), 'sfx', 7)
  assert.deepEqual(parseVolumes(serializeVolumes(v)), { ...DEFAULT_VOLUMES, music: 0.1, sfx: 1 })
  assert.deepEqual(parseVolumes(null), DEFAULT_VOLUMES)
  assert.deepEqual(parseVolumes('not json'), DEFAULT_VOLUMES)
  assert.deepEqual(parseVolumes('[1,2]'), DEFAULT_VOLUMES)
  assert.deepEqual(parseVolumes('{"voice":"loud","ambience":0.3}'), { ...DEFAULT_VOLUMES, ambience: 0.3 })
})

test('footsteps fall once per stride however the distance is sliced', () => {
  const run = (slices: readonly number[]) => slices.reduce((s, d) => pace(s, d).gait, standing)
  const fine = run(Array.from({ length: 1000 }, () => 0.01))
  const coarse = run(Array.from({ length: 10 }, () => 1))
  assert.equal(fine.steps, coarse.steps)
  assert.equal(fine.steps, Math.floor((10 + standing.carry) / STRIDE))
})

test('the first step comes soon after starting, and stopping resets the stride', () => {
  const first = pace(standing, STRIDE * 0.45)
  assert.equal(first.falls, 1)
  const stopped = pace(pace(standing, STRIDE * 0.2).gait, 0)
  assert.deepEqual(stopped.gait, standing)
  assert.equal(pace(standing, 0).falls, 0)
})

test('every prologue space has an ambience bed and a surface under every walkable point', () => {
  Object.values(spaces).forEach((s) => {
    const scape = soundscapes[s.id]
    assert.ok(scape.layers.some((l) => l.bus === 'ambience'), `${s.id} has no ambience bed`)
    const grid = Array.from({ length: 21 }, (_, i) => i / 20 - 0.5)
    grid.forEach((u) => grid.forEach((w) => assert.ok(surfaceAt(scape.ground, vec(u * s.size.w, w * s.size.d)))))
  })
})

test('surfaces: wood indoors, gravel and creek mud at camp, water and a doorstep in the flood', () => {
  assert.equal(surfaceAt(soundscapes.bar.ground, spaces.bar.spawn), 'wood')
  assert.equal(surfaceAt(soundscapes.room.ground, spaces.room.spawn), 'wood')
  assert.equal(surfaceAt(soundscapes.camp.ground, vec(1.8, -7.5)), 'gravel')
  assert.equal(surfaceAt(soundscapes.camp.ground, vec(0, 7.4)), 'mud')
  assert.equal(surfaceAt(soundscapes.flood.ground, spaces.flood.spawn), 'water')
  assert.equal(surfaceAt(soundscapes.flood.ground, vec(0, 7.1)), 'wood')
})

test('walking a real route counts steps from the distance the game moved', () => {
  const g0 = press(start(), 'close')
  const frames = Array.from({ length: 30 }).reduce<readonly ReturnType<typeof start>[]>(
    (acc) => [...acc, tick(acc[acc.length - 1], { dir: vec(0, -1), hold: false }, DT)],
    [g0],
  )
  const dist = frames.slice(1).reduce((d, g, i) => d + walked(frames[i], g), 0)
  const gait = frames.slice(1).reduce((s, g, i) => pace(s, walked(frames[i], g)).gait, standing)
  assert.ok(dist > 2)
  assert.equal(gait.steps, Math.floor((dist + standing.carry) / STRIDE))
})

test('changing space is not walking, and the room door closes on arrival', () => {
  const bar = walk(talk(start(), 'texas'), [[0, 4.2]])
  const room = interact(bar)
  assert.equal(room.space, 'room')
  assert.equal(walked(bar, room), 0)
  assert.deepEqual(arrivals(bar, room), ['door'])
  assert.deepEqual(arrivals(room, tick(room, still, DT)), [])
  assert.deepEqual(arrivals(undefined, room), [])
})

test('the typewriter runs while the letter is open, and the jerry can while Curly refuels', () => {
  const room = interact(walk(talk(start(), 'texas'), [[0, 4.2]]))
  const desk = interact(walk(room, [[1.6, -0.8]]))
  assert.ok(!holds('writing', room))
  assert.ok(holds('writing', desk))
  const camp = walk(press(desk, 'fly'), routes.marker.slice(0, 1))
  assert.ok(refueling(0) && refueling(WORK - 0.01) && !refueling(WORK + 0.01) && refueling(CURLY_PERIOD))
  assert.equal(holds('refueling', { ...camp, t: 1 }), true)
  assert.equal(holds('refueling', { ...camp, t: WORK + 1 }), false)
  assert.equal(holds('refueling', room), false)
  assert.equal(holds(undefined, room), true)
})

test('ducking follows the panel', () => {
  assert.ok(ducked(start()))
  assert.ok(!ducked(press(start(), 'close')))
})

test('the creek follows the listener along its bank and stays inside the camp', () => {
  assert.deepEqual(sourceAt(vec(0, 9), true, vec(4, -2), 14), vec(4, 9))
  assert.deepEqual(sourceAt(vec(0, 9), true, vec(30, -2), 14), vec(14, 9))
  assert.deepEqual(sourceAt(vec(1, 2), undefined, vec(4, -2), 14), vec(1, 2))
})

test('generated noise is bounded, deterministic and not silent', () => {
  ;(['white', 'pink', 'brown'] as const).forEach((c) => {
    const a = noiseSamples(c, 4096, 7)
    assert.ok(a.every((v) => Number.isFinite(v) && Math.abs(v) <= 1))
    assert.ok(a.some((v) => Math.abs(v) > 0.05))
    assert.deepEqual(a, noiseSamples(c, 4096, 7))
  })
})

test('the jukebox placeholder plays roots on the beat and chords off it', () => {
  assert.equal(midiHz(69), 440)
  assert.equal(beatAt(0).chord, undefined)
  assert.ok(beatAt(1).chord)
  assert.equal(beatAt(2).bass, beatAt(0).bass + 7)
  assert.deepEqual(beatAt(16), beatAt(0))
})

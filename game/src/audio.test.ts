import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Volumes } from './mixer.ts'
import { DEFAULT_VOLUMES, DUCK, busGain, busGains, parseVolumes, serializeVolumes, sliderGain, withVolume } from './mixer.ts'
import type { Gait } from './footsteps.ts'
import { pace, standing, strideFor, surfaceAt } from './footsteps.ts'
import { spaces } from './levels.ts'
import { BEATS, CURLY_PERIOD, beatStart } from './curly.ts'
import { INDOOR_PACE, JOG, WALK, interact, press, start, still, tick } from './prologue.ts'
import { DT, talk, toRoom, walk } from './drive.ts'
import { legs } from './downtown.ts'
import { arrivals, cues, ducked, holds, refueling, soundscapes, sourceAt, walked } from './soundscape.ts'
import { beatAt, midiHz, noiseSamples } from './synth.ts'
import { createAudio } from './audio.ts'
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

test('footsteps fall once per stride at a steady pace however the time is sliced', () => {
  const speed = 3.2
  const run = (dt: number, n: number) =>
    Array.from({ length: n }).reduce<Gait>((s) => pace(s, speed * dt, dt).gait, standing)
  const fine = run(0.01, 1000)
  const coarse = run(0.5, 20)
  assert.equal(fine.steps, coarse.steps)
  assert.equal(fine.steps, Math.floor(standing.phase + (speed * 10) / strideFor(speed)))
})

test('the stride lengthens with speed: a walk is short, a jog is long', () => {
  assert.ok(Math.abs(strideFor(WALK) - 0.73) < 0.02)
  assert.ok(strideFor(JOG) >= 1.1 && strideFor(JOG) <= 1.25)
  assert.ok(strideFor(JOG) > strideFor(WALK))
  const steps = (speed: number) => Array.from({ length: 100 }).reduce<Gait>((s) => pace(s, speed * 0.1, 0.1).gait, standing).steps
  assert.ok(steps(1.4) < steps(3.5))
})

test('the first step comes soon after starting, and stopping resets the stride', () => {
  const stride = strideFor(JOG)
  assert.equal(pace(standing, stride * 0.45, (stride * 0.45) / JOG).falls, 1)
  const stopped = pace(pace(standing, stride * 0.2, (stride * 0.2) / JOG).gait, 0, 1 / 30)
  assert.deepEqual(stopped.gait, standing)
  assert.equal(pace(standing, 0, 1 / 30).falls, 0)
  assert.equal(pace(standing, 1, 0).falls, 0)
})

test('every space in an act has an ambience bed and a surface under every walkable point', () => {
  Object.values(spaces).filter((s) => s.act).forEach((s) => {
    const scape = soundscapes[s.id]
    assert.ok(scape.layers.some((l) => l.bus === 'ambience'), `${s.id} has no ambience bed`)
    const grid = Array.from({ length: 21 }, (_, i) => i / 20 - 0.5)
    grid.forEach((u) => grid.forEach((w) => assert.ok(surfaceAt(scape.ground, vec(u * s.size.w, w * s.size.d)))))
  })
})

test('surfaces: wood indoors, gravel and creek mud at camp, the porch and the walkway over the water in the flood', () => {
  assert.equal(surfaceAt(soundscapes.bar.ground, spaces.bar.spawn), 'wood')
  assert.equal(surfaceAt(soundscapes.room.ground, spaces.room.spawn), 'wood')
  assert.equal(surfaceAt(soundscapes.camp.ground, vec(1.8, -7.5)), 'gravel')
  assert.equal(surfaceAt(soundscapes.camp.ground, vec(0, 7.4)), 'mud')
  assert.equal(surfaceAt(soundscapes.flood.ground, spaces.flood.spawn), 'wood')
  assert.equal(surfaceAt(soundscapes.flood.ground, vec(150, 97.5)), 'wood')
  assert.equal(surfaceAt(soundscapes.flood.ground, vec(135, 104)), 'water')
})

test('walking a real route counts steps from the distance the game moved', () => {
  const north = { dir: vec(0, -1), hold: false, run: true }
  const warm = Array.from({ length: 20 }).reduce<ReturnType<typeof start>>((g) => tick(g, north, DT), press(start(), 'close'))
  const frames = Array.from({ length: 25 }).reduce<readonly ReturnType<typeof start>[]>(
    (acc) => [...acc, tick(acc[acc.length - 1], north, DT)],
    [warm],
  )
  const dist = frames.slice(1).reduce((d, g, i) => d + walked(frames[i], g), 0)
  const gait = frames.slice(1).reduce((s, g, i) => pace(s, walked(frames[i], g), DT).gait, standing)
  assert.ok(dist > 1)
  assert.equal(gait.steps, Math.floor(standing.phase + dist / strideFor(INDOOR_PACE)))
})

test('changing space is not walking, and the boarding house door closes on arrival', () => {
  const bar = walk(talk(start(), 'texas'), [[0, 4.2]])
  const street = interact(bar)
  assert.equal(street.space, 'downtown')
  assert.equal(walked(bar, street), 0)
  assert.deepEqual(arrivals(bar, street), [])
  const door = walk(street, legs[0]!.route)
  const room = interact(door)
  assert.equal(room.space, 'boarding')
  assert.equal(walked(door, room), 0)
  assert.deepEqual(arrivals(door, room), ['door'])
  assert.deepEqual(arrivals(room, tick(room, still, DT)), [])
  assert.deepEqual(arrivals(undefined, room), [])
})

test('the typewriter runs while the letter is open, and the jerry can while Curly refuels', () => {
  const room = toRoom(talk(start(), 'texas'))
  const desk = interact(walk(room, [[0.6, -1.0]]))
  assert.ok(!holds('writing', room))
  assert.ok(holds('writing', desk))
  assert.equal(desk.story.scene, 'p_letter')
  assert.ok(!holds('writing', press(desk, 'finish')))
  const camp = { ...press(start(), 'close'), space: 'camp' as const, pos: spaces.camp.spawn }
  const WORK = BEATS[0].time
  assert.equal(BEATS[0].id, 'refuel')
  assert.ok(refueling(0) && refueling(WORK - 0.01) && !refueling(WORK + 0.01) && refueling(CURLY_PERIOD))
  assert.equal(holds('refueling', { ...camp, t: 1 }), true)
  assert.equal(holds('refueling', { ...camp, t: WORK + 1 }), false)
  assert.equal(holds('refueling', { ...camp, t: WORK + 1, watch: { lost: WORK, aware: 0 } }), true, 'his clock stops while he looks toward a noise')
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

const throwingStore = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
} as unknown as Storage

test('with storage blocked and no Web Audio, the engine starts locked, gives up quietly and keeps volumes', () => {
  const audio = createAudio(throwingStore)
  assert.equal(audio.status(), 'locked')
  assert.deepEqual(audio.volumes(), DEFAULT_VOLUMES)
  audio.unlock()
  assert.equal(audio.status(), 'unavailable')
  audio.sync(press(start(), 'close'), DT)
  audio.setVolume('music', 0.25)
  assert.equal(audio.volumes().music, 0.25)
  assert.equal(audio.status(), 'unavailable')
})

test('the engine starts on medium and takes a new tier at once, even before it is unlocked', () => {
  const audio = createAudio(undefined)
  assert.equal(audio.quality(), 'medium')
  audio.setQuality('low')
  assert.equal(audio.quality(), 'low')
  audio.sync(start(), DT)
  assert.equal(audio.quality(), 'low')
})

test('saved volumes are read back on start', () => {
  const saved = new Map<string, string>()
  const store = { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => void saved.set(k, v) } as unknown as Storage
  createAudio(store).setVolume('voice', 0.1)
  assert.equal(createAudio(store).volumes().voice, 0.1)
  assert.equal(createAudio(undefined).volumes().voice, DEFAULT_VOLUMES.voice)
})

test('Curly\'s lighter clicks as he finishes his work and turns to look, at the camp only, and never under a panel', () => {
  const camp = { ...press(start(), 'close'), space: 'camp' as const, pos: spaces.camp.spawn }
  const at = beatStart('glance')
  assert.deepEqual(cues({ ...camp, t: at - 0.02 }, { ...camp, t: at + 0.01 }), ['snap'])
  assert.deepEqual(cues({ ...camp, t: at + 0.01 }, { ...camp, t: at + 0.05 }), [])
  assert.deepEqual(cues({ ...camp, t: at - 0.02, space: 'bar' }, { ...camp, t: at + 0.01 }), [])
  assert.deepEqual(cues({ ...camp, t: at - 0.02 }, { ...camp, t: at + 0.01, panel: { kind: 'busted', title: '', text: '', buttons: [] } }), [])
  assert.deepEqual(cues({ ...camp, t: at + 1, watch: { lost: 1.03, aware: 0 } }, { ...camp, t: at + 1.04, watch: { lost: 1.03, aware: 0 } }), ['snap'], 'by his own clock')
})

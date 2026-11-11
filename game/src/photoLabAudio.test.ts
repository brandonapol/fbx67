import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Lab, Walker, Way } from './photoLab.ts'
import { CLERK_BACK, WATCH, begin, poseAt, roundTime, spotter } from './photoLab.ts'
import type { Cue, Sound, Watch } from './photoLabAudio.ts'
import { CUE, labCues } from './photoLabAudio.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import { soundscapes } from './soundscape.ts'
import { surfaceAt } from './footsteps.ts'
import { makeBuffers, mulberry, spot } from './synth.ts'
import { fakeContext } from './fake-audio.ts'

const OUT = vec(0, 0)
const at = (way: Way, clock: number, aware = 0): Lab => ({ ...begin(way, OUT, 0), clock, aware })

// Every cue from `from` to `to` seconds into the run, a frame at a time, Wade standing out of everyone's way.
const run = (way: Way, from: number, to: number, dt = 1 / 30): readonly Cue[] =>
  Array.from({ length: Math.round((to - from) / dt) }, (_, i) => labCues(at(way, from + i * dt), at(way, from + (i + 1) * dt), OUT)).flat()

const sounds = (cs: readonly Cue[], s: Sound): readonly Cue[] => cs.filter((c) => c.sound === s)

const walker = (way: Way, id: Walker['id']): Walker => WATCH[way].find((w) => w.id === id)!

test('each watcher state maps to its cue: steps, the clerk back from lunch, a door, being seen', () => {
  const expected: Readonly<Record<Watch, Readonly<Record<Walker['id'], Sound | undefined>>>> = {
    walking: { clerk: 'step', airman: 'step', sergeant: 'step' },
    back: { clerk: 'snap', airman: undefined, sergeant: undefined },
    entering: { clerk: 'door', airman: 'door', sergeant: 'door' },
    seeing: { clerk: 'sting', airman: 'sting', sergeant: 'sting' },
  }
  ;(Object.keys(expected) as Watch[]).forEach((s) =>
    (['clerk', 'airman', 'sergeant'] as const).forEach((id) => assert.equal(CUE[id][s], expected[s][id], `${id} ${s}`)),
  )
})

test('a walking watcher sounds a step at his feet each stride, and nothing while he stands or is out', () => {
  const clerk = walker('lunch', 'clerk')
  const out = run('lunch', 3, 5)
  const steps = sounds(out, 'step')
  assert.ok(steps.length >= 2 && steps.length <= 5, `${steps.length} steps in 2 s of walking`)
  steps.forEach((c) => assert.equal(c.bus, 'sfx'))
  const last = steps.at(-1)!
  assert.ok(Math.hypot(last.at.x - poseAt(clerk, 5).at.x, last.at.z - poseAt(clerk, 5).at.z) < 1.5, 'the step is where the clerk is')
  assert.deepEqual(sounds(run('lunch', 0, 1.9), 'step'), [], 'standing at the counter')
  const lunch = poseAt(clerk, 60)
  assert.ok(lunch.away)
  assert.deepEqual(sounds(run('lunch', 60, 62), 'step').filter((c) => Math.hypot(c.at.x - lunch.at.x, c.at.z - lunch.at.z) < 1), [], 'out to lunch')
})

test('the clerk lights up once as he comes back from lunch, and comes in the front door once', () => {
  const back = sounds(run('lunch', CLERK_BACK - 1, CLERK_BACK + 1), 'snap')
  assert.equal(back.length, 1)
  assert.deepEqual(sounds(run('lunch', 0, CLERK_BACK - 1), 'snap'), [])
  const doors = sounds(run('lunch', CLERK_BACK, CLERK_BACK + 30), 'door')
  assert.equal(doors.length, 1)
  assert.ok(Math.abs(doors[0]!.at.z - 30) < 0.5, `the door is the front door, at z ${doors[0]!.at.z}`)
})

test('the duty sergeant lets himself in at the back door once a round', () => {
  const sergeant = walker('key', 'sergeant')
  const doors = sounds(run('key', 0, roundTime(sergeant)), 'door')
  assert.equal(doors.length, 1)
  assert.ok(Math.abs(doors[0]!.at.x - 190) < 0.5, `the back door, at x ${doors[0]!.at.x}`)
})

test('the sting sounds on Wade the moment a watcher starts to see him, and only then', () => {
  const wade: Vec = vec(142, 46)
  assert.equal(spotter('lunch', 10, wade)?.id, 'airman', 'the airman faces west down the hall')
  const sting = labCues(at('lunch', 10), at('lunch', 10.03, 0.06), wade)
  assert.deepEqual(sounds(sting, 'sting'), [{ sound: 'sting', bus: 'music', at: wade }])
  assert.deepEqual(sounds(labCues(at('lunch', 10.03, 0.06), at('lunch', 10.06, 0.12), wade), 'sting'), [], 'already seen')
})

test('nothing sounds across a restart, at the start of a run, or with no run', () => {
  assert.deepEqual(labCues(at('lunch', 4), at('lunch', 0), OUT), [])
  assert.deepEqual(labCues(undefined, at('lunch', 4), OUT), [])
  assert.deepEqual(labCues(at('lunch', 4), undefined, OUT), [])
  assert.deepEqual(labCues(at('lunch', 4), at('key', 4.1), OUT), [])
})

test('the sting builds and schedules finite times, and the lab floor is concrete under the steps', () => {
  const { ctx, times } = fakeContext()
  const end = spot(ctx, makeBuffers(ctx), 'sting', ctx.createGain(), mulberry(5))
  assert.ok(Number.isFinite(end) && end > 0.5, `ends at ${end}`)
  assert.ok(times.t.every(Number.isFinite))
  assert.equal(surfaceAt(soundscapes.eielson.ground, vec(165, 46)), 'concrete', 'the lab hall')
  assert.equal(surfaceAt(soundscapes.eielson.ground, vec(160, 12)), 'gravel', 'out front')
})

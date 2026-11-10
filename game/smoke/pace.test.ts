import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HIDE_TIME } from '../src/camp.ts'
import { BEATS, LOOK_FROM, beatStart, routine } from '../src/curly.ts'
import { CURLY_WINDOW, FRAME_STEP, hiddenBy } from './pace.ts'

// The keyboard smoke run waits for Curly's clock and hides at FAST pace. At one tick a frame that wait cost the run
// about 200 s in the camp under software rendering and timed it out in CI; these hold the reasons FAST is safe.

test('no frame at FAST steps over the window the camp hide waits for', () => {
  assert.ok(FRAME_STEP < CURLY_WINDOW, `a frame steps ${FRAME_STEP} s, the window is ${CURLY_WINDOW} s`)
})

test('the window opens with Curly at his work, not looking', () => {
  assert.equal(BEATS[0]!.id, 'refuel')
  assert.ok(CURLY_WINDOW <= BEATS[0]!.time, 'the window is inside his first beat')
  const steps = Math.ceil(CURLY_WINDOW / 0.05)
  Array.from({ length: steps + 1 }, (_, i) => (i * CURLY_WINDOW) / steps).forEach((t) =>
    assert.equal(routine(t).eyes, false, `he looks at ${t} s`),
  )
})

test('at FAST the hide finishes before Curly turns to look over the camp', () => {
  const done = hiddenBy(HIDE_TIME)
  assert.ok(done < beatStart('glance'), `hidden by ${done.toFixed(2)} s, he glances at ${beatStart('glance').toFixed(2)} s`)
  assert.ok(done < LOOK_FROM)
})

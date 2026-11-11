import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu } from '../../text-game/src/story.ts'
import { startFrom } from '../src/start.ts'
import { poses } from '../src/probe.ts'
import { starts } from './starts.ts'
import { spaces } from '../src/levels.ts'

test('each smoke start reaches its scene, every act has one, in a space its pose is for', () => {
  starts.forEach((s) => {
    const g = startFrom(`#path=${s.path}`, '')
    assert.equal(g.story.scene, s.scene, s.path)
    assert.equal(g.panel?.kind === 'error', false, s.scene)
    assert.equal(poses[s.pose]?.space, g.space, `${s.scene} starts in ${g.space}, pose ${s.pose} is not for it`)
    ;(s.also ?? []).forEach((p) => assert.equal(poses[p]?.space, g.space, `${s.scene}: pose ${p} is not for ${g.space}`))
  })
  assert.deepEqual(
    [...new Set(starts.map((s) => menu(startFrom(`#path=${s.path}`, '').story).act))],
    ['Act 1: Flood', 'Act 2: Freeze-up', 'Act 3: Deep Winter', 'Act 4: Breakup'],
  )
})

// Regression: the prologue run budgets every space in levels.ts, so each Act 1 space needs a start that records frames
// in it. The Silver Pan (pan) had none and the run failed with "pan: no frames recorded".
test('every Act 1 space has a smoke start that opens in it', () => {
  const opened = new Set(starts.map((s) => startFrom(`#path=${s.path}`, '').space))
  Object.values(spaces)
    .filter((sp) => sp.act === 'Act 1: Flood')
    .forEach((sp) => assert.ok(opened.has(sp.id), `${sp.id} has no start`))
})

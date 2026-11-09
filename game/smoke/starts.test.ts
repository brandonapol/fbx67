import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu } from '../../text-game/src/story.ts'
import { startFrom } from '../src/start.ts'
import { poses } from '../src/probe.ts'
import { starts } from './starts.ts'

test('each smoke start reaches its scene, one per act, in a space its pose is for', () => {
  starts.forEach((s) => {
    const g = startFrom(`#path=${s.path}`, '')
    assert.equal(g.story.scene, s.scene, s.path)
    assert.equal(g.panel?.kind === 'error', false, s.scene)
    assert.equal(poses[s.pose]?.space, g.space, `${s.scene} starts in ${g.space}, pose ${s.pose} is not for it`)
  })
  assert.deepEqual(
    starts.map((s) => menu(startFrom(`#path=${s.path}`, '').story).act),
    ['Act 1: Flood', 'Act 2: Freeze-up', 'Act 3: Deep Winter', 'Act 4: Breakup'],
  )
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { bodies } from './cast.ts'
import { bodyFor } from './pov.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import { pov } from '../../text-game/src/story.ts'

const at = (scene: (typeof sceneIds)[number]) => ({ ...initialState, scene })

test('the prologue is Owen, a1 on is Wade, and Lucy has her own scenes', () => {
  assert.equal(bodyFor(initialState, false), bodies.owen)
  assert.equal(bodyFor(at('a1_letter'), false), bodies.wade)
  assert.equal(bodyFor(at('a3_camp'), false), bodies.lucy)
})

test('the skiff keeps Owen in the stern whatever the story says', () => {
  assert.equal(bodyFor(at('a1_letter'), true), bodies.owen)
  assert.equal(bodyFor(at('a3_camp'), true), bodies.owen)
})

test('every scene has a body, and its eye and tread are usable', () => {
  sceneIds.forEach((scene) => {
    const b = bodyFor(at(scene), false)
    assert.equal(b, bodies[pov(at(scene))], scene)
    assert.ok(b.eye > 1 && b.eye < 2.2, scene)
    assert.ok(b.tread.pitch > 0 && b.tread.weight > 0, scene)
  })
})

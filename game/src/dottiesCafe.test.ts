import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { place } from '../../text-game/src/story.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import type { SceneId, State } from '../../text-game/src/types.ts'
import { CAFE_SCENES, COUNTER_SPOT, SPAWN, WADE_STOOL, cafe, counterSpot, props, visiting } from './dottiesCafe.ts'
import { hits } from './world.ts'

// Dottie's café (dottiesCafe.ts), the room itself: the three gossip visits are its scenes, and only they use the
// counter. How Wade gets there and what the counter sends is played headless below.

const at = (scene: SceneId): State => ({ ...initialState, scene })

test('the café plays the three gossip visits, each at the café in the story', () => {
  assert.deepEqual(CAFE_SCENES, ['a2_co_gossip', 'a2_heat_gossip', 'a3_rash_gossip'])
  for (const id of CAFE_SCENES) assert.equal(place(at(id)), 'nlCafe', id)
})

test('the counter is only there on a gossip visit', () => {
  for (const id of sceneIds) {
    const s = at(id)
    assert.equal(visiting(s), CAFE_SCENES.includes(id), id)
    assert.equal(counterSpot(s, COUNTER_SPOT.id), CAFE_SCENES.includes(id), id)
  }
  assert.equal(counterSpot(at('a2_heat_gossip'), 'door'), false)
})

test('the room is clear where Wade walks: the door, the aisle, his stool', () => {
  const solid = props.filter((p) => p.solid).map((p) => p.box)
  for (const p of [SPAWN, WADE_STOOL, { x: -1, z: 0 }, { x: 0, z: 0.8 }]) {
    assert.deepEqual(solid.filter((b) => hits(p, b)), [], `${p.x}, ${p.z}`)
  }
  for (const p of props) {
    assert.ok(Math.abs(p.box.x) <= cafe.size.w / 2 && Math.abs(p.box.z) <= cafe.size.d / 2, `inside at ${p.box.x}, ${p.box.z}`)
  }
})

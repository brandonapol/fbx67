import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import type { State } from '../../text-game/src/types.ts'
import {
  COME_TO,
  COUGHS,
  CRASH_TIME,
  FIRE_AT,
  IMPACT,
  PLACE_AT,
  SPRUCE,
  WRECK_AT,
  WRECK_SCENES,
  crashCues,
  crashFade,
  gliding,
  planeIn,
  standOf,
  wreckSpace,
} from './engineOut.ts'
import { spaces, solids } from './levels.ts'
import { route } from './router.ts'
import { FIRE_AT as FIRE_SOUND, act3Soundscapes, soundscapes } from './soundscape.ts'
import type { Night } from './survivalPlay.ts'
import { PLACES, act, begins, step } from './survivalPlay.ts'
import { distance } from './world.ts'

const at = (scene: State['scene']): State => ({ ...initialState, scene })

test('the crash’s beats in order: the coughs, the primer, the spruce, the impact, coming to', () => {
  assert.ok(COUGHS.every((c, i) => i === 0 || c > COUGHS[i - 1]!))
  assert.ok(COUGHS.at(-1)! < SPRUCE && SPRUCE < IMPACT && IMPACT < CRASH_TIME)
})

test('the screen goes black at the impact and comes back as she comes to', () => {
  assert.equal(crashFade(undefined), 0)
  assert.equal(crashFade(0), 0)
  assert.equal(crashFade(SPRUCE), 0)
  assert.equal(crashFade(IMPACT), 1)
  assert.equal(crashFade((IMPACT + CRASH_TIME) / 2), 1)
  assert.ok(crashFade(CRASH_TIME - 0.3) > 0 && crashFade(CRASH_TIME - 0.3) < 1)
  assert.equal(crashFade(CRASH_TIME), 0)
})

test('each cough and the impact sound once over the crash, whatever the frame rate', () => {
  for (const dt of [1 / 60, 1 / 30, 0.25, 1]) {
    const heard: string[] = []
    let prev: number | undefined
    for (let t = 0; t < CRASH_TIME; t += dt) {
      heard.push(...crashCues(prev, t))
      prev = t
    }
    assert.deepEqual(heard, [...COUGHS.map(() => 'cough'), 'impact'], `dt ${dt}`)
  }
  assert.deepEqual(crashCues(5, undefined), [], 'nothing once she has come to')
})

test('the plane comes down out of the sky onto the wreck, and lies there on its side', () => {
  const ys = Array.from({ length: 11 }, (_, i) => planeIn((i * IMPACT) / 10.0001).y)
  assert.ok(ys.every((y, i) => i === 0 || y <= ys[i - 1]!), 'always losing height')
  assert.ok(ys[0]! > 30)
  assert.ok(gliding(IMPACT - 0.01) && !gliding(IMPACT) && !gliding(undefined))
  const down = planeIn(IMPACT)
  assert.deepEqual(down.at, WRECK_AT)
  assert.equal(down.y, 0)
  assert.equal(down.roll, Math.PI / 2)
  assert.ok(distance(planeIn(IMPACT - 0.01).at, WRECK_AT) < 6, 'it comes down where the wreck lies')
})

test('the fire’s crackle is where the fire is drawn, and the wreck has the crash’s bed', () => {
  assert.deepEqual(FIRE_SOUND, FIRE_AT)
  assert.equal(soundscapes.wreck, act3Soundscapes.crash)
})

test('the crash and the night route to the wreck; Wade’s morning at the wreck does not, yet', () => {
  assert.deepEqual(WRECK_SCENES, ['a3_crash', 'a3_survive_fire', 'a3_survive_jake'])
  for (const scene of ['a3_crash', 'a3_survive_fire', 'a3_survive_jake'] as const) assert.deepEqual(route(at(scene), 'story'), { to: 'space', space: 'wreck' })
  for (const scene of ['a3_arm', 'a3_wreck'] as const) assert.notDeepEqual(route(at(scene), 'story'), { to: 'space', space: 'wreck' })
  assert.equal(spaces.wreck.act, wreckSpace.act)
})

test('each of the night’s places is on the hillside and clear of the wreck, the trees and the drifts', () => {
  const half = spaces.wreck.size.w / 2
  const hard = solids(spaces.wreck)
  for (const p of [...PLACES.map((x) => PLACE_AT[x]), COME_TO]) {
    assert.ok(Math.abs(p.x) < half - 1 && Math.abs(p.z) < half - 1, `${p.x},${p.z} is on the hillside`)
    assert.ok(!hard.some((b) => Math.abs(p.x - b.x) < b.w / 2 + 0.25 && Math.abs(p.z - b.z) < b.d / 2 + 0.25), `${p.x},${p.z} is clear`)
  }
  assert.ok(distance(PLACE_AT.fire, FIRE_AT) <= 1.01, 'a meter from the fire, as survivalPlay.ts has her')
})

test('Lucy stands at her place, and on a walk is as far along it as the walk has gone', () => {
  const n = begins(at('a3_crash'), 'fire')!
  assert.deepEqual(standOf(n).at, PLACE_AT.cabin)
  const going: Night = act(n, 'go:fire')
  const total = going.doing!.total
  const half = standOf(step(going, total / 2))
  assert.ok(Math.abs(distance(half.at, PLACE_AT.cabin) - distance(half.at, PLACE_AT.fire)) < 1e-6, 'halfway')
  assert.ok(distance({ x: 0, z: 0 }, half.vel) > 0)
  const there = standOf(step(step(going, total / 2), total / 2 + 0.01))
  assert.deepEqual(there.at, PLACE_AT.fire)
  assert.deepEqual(there.vel, { x: 0, z: 0 })
})

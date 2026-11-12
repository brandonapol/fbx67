import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { send } from '../../text-game/src/story.ts'
import { clock, menu, place } from '../../text-game/src/story.ts'
import type { CacheSpot, SceneId, State } from '../../text-game/src/types.ts'
import { camp, campProps } from './camp.ts'
import type { Exposure } from './survival.ts'
import { clockOf, lightOf } from './survival.ts'
import type { Dig } from './owensCamp.ts'
import { DIG_SPOTS, DIG_TIME, FAILED, HUB, JAKE, JAKE_AT, REREAD, WAYS, SPAWN, arrival, campSpot, digTime, dug, exposure, owensCamp, reread, step, winter, winterCamp } from './owensCamp.ts'
import { blocked, vec } from './world.ts'
import type { Box, Vec } from './world.ts'

// Lucy's dig at Owen's camp in winter (owensCamp.ts, #139), its pure parts: the space, the spots, the light and the cold,
// and what a finished dig sends. The game loop's play of it is tested in owensCampPlay.test.ts.

const SPOTS: readonly CacheSpot[] = ['stove', 'cache', 'marker']

const at = (scene: SceneId, owenCache?: CacheSpot): State => ({ ...initialState, scene, owenCache })

test("the space is the prologue's camp, with the winter laid over it as data", () => {
  assert.equal(owensCamp.place, camp.place)
  assert.equal(owensCamp.place, place(at('a3_camp')))
  assert.equal(owensCamp.act, menu(at('a3_camp')).act)
  assert.deepEqual(owensCamp.size, camp.size)
  assert.deepEqual(winterCamp, [...campProps.filter((p) => p.while !== 'parked'), ...winter])
  assert.deepEqual(
    DIG_SPOTS.map((d) => [d.id, d.x, d.z]),
    camp.spots.filter((s) => s.note).map((s) => [s.id, s.x, s.z]),
    'the three places are where Owen hid things in the prologue',
  )
  assert.ok(winter.every((p) => !p.while), 'the dressing is always there: data, not state')
})

const solid = (props: typeof winterCamp): readonly Box[] => props.filter((p) => p.solid).map((p) => p.box)

test('Lucy steps off by Jake with a clear walk to each of the three places', () => {
  const walls = [...solid(winterCamp), { x: JAKE_AT.x, z: JAKE_AT.z, w: 0.5, d: 0.5 }]
  assert.equal(blocked(SPAWN, walls), false)
  // Up the bar to the fire ring, then along each way to its place: every leg a straight clear line.
  const clear = (a: Vec, b: Vec) => {
    for (let k = 0; k <= 40; k++) {
      const p = vec(a.x + ((b.x - a.x) * k) / 40, a.z + ((b.z - a.z) * k) / 40)
      assert.equal(blocked(p, walls), false, `${p.x.toFixed(2)}, ${p.z.toFixed(2)}`)
    }
  }
  SPOTS.forEach((s) => [SPAWN, HUB, ...WAYS[s]].forEach((p, i, all) => i && clear(all[i - 1]!, p)))
  SPOTS.forEach((s) => {
    const end = WAYS[s].at(-1)!
    const spot = DIG_SPOTS.find((d) => d.id === s)!
    assert.ok(Math.hypot(end.x - spot.x, end.z - spot.z) <= spot.r, `${s}'s way ends in reach`)
  })
})

test('the three places are open until the bundle is found, then only Jake; a dug spot closes', () => {
  const d = arrival(at('a3_camp', 'stove'))
  SPOTS.forEach((s) => assert.equal(campSpot(at('a3_camp', 'stove'), d, s), true))
  assert.equal(campSpot(at('a3_camp', 'stove'), d, JAKE), false)
  const after = dug(at('a3_wrong_spot', 'stove'), d, 'marker', SPAWN, 0).dig
  assert.deepEqual(SPOTS.map((s) => campSpot(at('a3_wrong_spot', 'stove'), after, s)), [true, true, false])
  assert.deepEqual([...SPOTS, JAKE].map((s) => campSpot(at('a3_found'), d, s)), [false, false, false, true])
})

test("the first dig sends the spot as a3_camp's note, and the story, not the engine, says if it was right", () => {
  SPOTS.forEach((hid) =>
    SPOTS.forEach((spot) => {
      const s = at('a3_camp', hid)
      const r = dug(s, arrival(s), spot, SPAWN, 0)
      assert.equal(r.send, spot)
      assert.equal(send(s, r.send!).scene, spot === hid ? 'a3_found' : 'a3_wrong_spot')
      assert.deepEqual(r.dig.checkpoint.carried.dug, [spot], 'the first spot dug is a checkpoint')
    }),
  )
})

test("after a wrong first dig only owenCache's spot sends the scene's dig; another wrong one sends nothing", () => {
  SPOTS.forEach((hid) => {
    const s = at('a3_wrong_spot', hid)
    SPOTS.forEach((spot) => {
      const r = dug(s, arrival(s), spot, SPAWN, 0)
      assert.equal(r.send, spot === hid ? 'dig' : undefined, `${hid} / ${spot}`)
      if (r.send) assert.equal(send(s, r.send).scene, 'a3_found')
    })
  })
})

test('the reread costs twenty minutes of light and leaves her fingers white', () => {
  const d = arrival(at('a3_camp'))
  const r = reread(d)
  assert.equal(r.played - d.played, REREAD)
  assert.equal(clockOf(r), '1967-12-12T11:20', "a3_wrong_spot's own clock")
  assert.equal(clockOf(r), clock(at('a3_wrong_spot')))
  assert.equal(r.body.hands, 'white')
  assert.equal(digTime(r), 2 * DIG_TIME, 'white hands dig at half speed')
  assert.equal(digTime(d), DIG_TIME)
})

const playOut = (d: Dig, e: Exposure): Readonly<{ dig: Dig; failed?: string; after: number }> => {
  let cur = d
  for (let n = 1; n < 3000; n++) {
    const r = step(cur, e, 1)
    if (r.failed) return { dig: r.dig, failed: r.failed, after: n }
    cur = r.dig
  }
  return { dig: cur, after: Infinity }
}

test('standing about at thirty-eight below freezes her, and the fade goes back to stepping off the plane', () => {
  const d = arrival(at('a3_camp'))
  assert.equal(lightOf(clockOf(d)), 'sun')
  const r = playOut(d, exposure(false, false))
  assert.equal(r.failed, 'froze')
  assert.ok(r.after > 3 * 60, 'minutes of play, not seconds')
  assert.ok(FAILED.froze)
  assert.deepEqual(r.dig.carried, d.checkpoint.carried)
  assert.equal(r.dig.played, 0)
})

test('the light running out fades back to the first spot dug, with the spot still dug', () => {
  const s = at('a3_camp', 'stove')
  const late: Dig = { ...arrival(s), start: '1967-12-12T15:00' }
  const first = dug(s, late, 'marker', HUB, 0).dig
  // Kept warm (as by a fire at her feet), so only the sky can end it.
  const r = playOut(first, { ...exposure(true, false), fire: 0 })
  assert.equal(r.failed, 'dark')
  assert.ok(FAILED.dark)
  assert.deepEqual(r.dig.carried, { at: HUB, facing: 0, dug: ['marker'] })
})

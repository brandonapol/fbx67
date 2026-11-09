import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { prologue } from '../../text-game/src/scenes/prologue.ts'
import { prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import { say } from '../../text-game/src/ambient/select.ts'
import type { Claims, Pose } from './ambient.ts'
import { assign, capacity, claim, poses, release, scheduled, slots, spaceOf, spotOf, wants, windowNow } from './ambient.ts'
import { solids, spaces } from './levels.ts'
import { RADIUS, distance, hits } from './world.ts'

const states: readonly State[] = prologue.map((sc) => ({ ...initialState, scene: sc.id }))
const at = (scene: string): State => ({ ...initialState, scene: scene as State['scene'] })
const barNight = at('p_bar')
const walkHome = at('p_letter')
const walkToRiver = at('p_dock')
const slot = (id: string) => slots.find((s) => s.id === id)!
const seeds = Array.from({ length: 24 }, (_, i) => i + 1)
const times = Array.from({ length: 121 }, (_, i) => i * 0.5)

test('a slot takes people up to its seats and refuses the next', () => {
  const stool = slot('silverPan.stool1')
  const walk = slot('secondAvenue.walk')
  const one = claim({}, stool, 'miner')!
  assert.deepEqual(one, { 'silverPan.stool1': ['miner'] })
  assert.equal(claim(one, stool, 'reporter'), undefined)
  const pair = claim(claim({}, walk, 'touristHusband')!, walk, 'touristWife')!
  assert.equal(capacity(walk), 2)
  assert.deepEqual(pair['secondAvenue.walk'], ['touristHusband', 'touristWife'])
  assert.equal(claim(pair, walk, 'preacher'), undefined)
})

test('taking a slot lets go of the last one, and releasing frees it for someone else', () => {
  const c: Claims = claim({}, slot('silverPan.stool1'), 'miner')!
  const moved = claim(c, slot('silverPan.stool2'), 'miner')!
  assert.deepEqual(moved, { 'silverPan.stool2': ['miner'] })
  assert.deepEqual(release(moved, 'miner'), {})
  assert.deepEqual(claim(release(moved, 'miner'), slot('silverPan.stool2'), 'reporter'), { 'silverPan.stool2': ['reporter'] })
})

test('the schedule lookup puts each person where the story clock says', () => {
  const where = (s: State) => Object.fromEntries(scheduled(s).map((a) => [a.id, spotOf(windowNow(s, a)!)]))
  assert.deepEqual(where(barNight), {
    nightBartender: 'silverPan', airmanJukebox: 'silverPan', airmanCounter: 'silverPan', airmanPool: 'silverPan',
    pilotGray: 'silverPan', pilotYoung: 'silverPan', miner: 'silverPan', reporter: 'silverPan', foreman: 'silverPan',
  })
  assert.deepEqual(where(walkHome), {
    preacher: 'secondAvenue', cabbie: 'secondAvenue', touristHusband: 'secondAvenue', touristWife: 'secondAvenue',
    landlady: 'boardingHouse porch', boarder: 'boardingHouse porch',
  })
  const morning = where(walkToRiver)
  assert.equal(morning.reporter, 'cushman')
  assert.equal(morning.foreman, 'nlCafe')
  assert.equal(morning.touristWife, 'cushman')
  assert.equal(morning.daughter, 'firstAvenue')
  assert.equal(morning.fisherman, 'floatDock')
  assert.equal(Object.keys(morning).length, 14)
  assert.deepEqual(scheduled(at('p_camp')), [], 'nobody from town is at the camp')
})

test('at least 25 distinct people across the bar, the street and the dock, each with a schedule and a slot kind', () => {
  const placed = new Set(states.flatMap((s) => poses(s, 1, 0).map((p) => p.who)))
  const standing = new Set(spaces.bar.figures.map((f) => f.id))
  const town = new Set(prologueTown.map((a) => a.id))
  const everyone = new Set([...placed, ...[...standing].filter((id) => town.has(id))])
  assert.ok(everyone.size >= 25, `${everyone.size} people`)
  assert.deepEqual(Object.keys(wants).sort(), [...town].sort(), 'every townsperson wants a slot kind, and no one else')
  const where = new Set(states.flatMap((s) => poses(s, 1, 0).map((p) => p.space)))
  assert.deepEqual([...where].sort(), ['bar', 'downtown'])
  assert.ok(poses(walkToRiver, 1, 0).some((p) => p.slot.startsWith('floatDock.')), 'the dock has people')
})

test('every window spot has slots, and everyone gets the kind of slot they want, for any seed', () => {
  for (const a of prologueTown) for (const w of a.at) assert.ok(spaceOf(spotOf(w)), `${a.id} at ${spotOf(w)} has no slots`)
  for (const s of states) {
    for (const seed of seeds) {
      const c = assign(s, seed)
      const held = Object.entries(c).flatMap(([id, who]) => who.map((w) => [w, slot(id)] as const))
      assert.equal(held.length, scheduled(s).length, `${s.scene} seed ${seed}: everyone placed`)
      for (const [who, sl] of held) assert.ok(wants[who].includes(sl.kind), `${s.scene} seed ${seed}: ${who} at ${sl.id}`)
      for (const [id, who] of Object.entries(c)) assert.ok(who.length <= capacity(slot(id)))
    }
  }
})

test('walking pairs and the family stroll together', () => {
  const night = poses(walkHome, 3, 12)
  const couple = night.filter((p) => p.who.startsWith('tourist'))
  assert.equal(couple.length, 2)
  assert.equal(couple[0].slot, couple[1].slot)
  assert.ok(couple.every((p) => p.speed > 0))
  assert.ok(Math.abs(distance(couple[0].at, couple[1].at) - 0.8) < 1e-9, 'shoulder to shoulder')
  const family = poses(walkToRiver, 3, 12).filter((p) => ['mother', 'father', 'daughter'].includes(p.who))
  assert.equal(new Set(family.map((p) => p.slot)).size, 1)
})

test('the same seed replays the same positions; strollers move and the seed moves them', () => {
  for (const s of states) {
    const run = (seed: number) => times.map((t) => poses(s, seed, t))
    assert.deepEqual(run(7), run(7), s.scene)
  }
  const tourist = (seed: number, t: number) => poses(walkHome, seed, t).find((p) => p.who === 'touristHusband')!.at
  assert.notDeepEqual(tourist(7, 0), tourist(7, 5), 'a stroller walks')
  assert.ok(seeds.some((seed) => JSON.stringify(tourist(seed, 0)) !== JSON.stringify(tourist(7, 0))), 'the seed sets where they start')
  const table = (seed: number) => JSON.stringify(assign(barNight, seed))
  assert.ok(seeds.some((seed) => table(seed) !== table(1)), 'the seed shuffles who sits where in the bar')
})

test('nobody stands in a wall or a figure, and no two people overlap, at any moment', () => {
  const overlaps = (ps: readonly Pose[]) =>
    ps.flatMap((p, i) => ps.slice(i + 1).filter((q) => q.space === p.space && distance(p.at, q.at) < 2 * RADIUS - 1e-9).map((q) => `${p.who}/${q.who}`))
  for (const s of states) {
    for (const seed of [1, 2, 3]) {
      for (const t of times) {
        const ps = poses(s, seed, t)
        assert.deepEqual(overlaps(ps), [], `${s.scene} seed ${seed} t ${t}`)
        for (const p of ps) {
          const inside = solids(spaces[p.space]).filter((b) => hits(p.at, b, 0.3))
          assert.deepEqual(inside, [], `${p.who} at ${p.slot} t ${t}`)
        }
      }
    }
  }
})

test('what the placed people say comes from the story layer', () => {
  for (const s of states) {
    const here = new Map(prologueTown.map((a) => [a.id, a]))
    for (const p of poses(s, 1, 0)) {
      const a = here.get(p.who)!
      const said = (['greet', 'bark', 'talk'] as const).map((tr) => say(s, a, tr, {})).find(Boolean)
      assert.ok(said, `${p.who} has nothing to say at ${s.scene}`)
    }
  }
})

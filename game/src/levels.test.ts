import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import { clock, season } from '../../text-game/src/story.ts'
import type { Clock, SceneId, State } from '../../text-game/src/types.ts'
import { castFor } from './cast.ts'
import { propsIn, solids, spaces } from './levels.ts'
import { timeOf } from './lighting.ts'
import { stageOf, townLayer } from './freezeup.ts'
import { place } from '../../text-game/src/story.ts'
import { spaceFor } from './router.ts'
import { PILE_AT, STAIR_X } from './landoffice.ts'
import { startFrom } from './start.ts'
import { walk } from './drive.ts'
import { blocked, vec } from './world.ts'

const at = (scene: SceneId): State => ({ ...initialState, scene })

// The season is the story's: no space carries one of its own (#125).
test('no space has a season of its own', () => {
  Object.values(spaces).forEach((s) => assert.ok(!('season' in s), s.id))
})

// One town, every season: downtown's own props are the same data in July, the flood and freeze-up, and the season's
// layer goes on top of them.
test('the same town data renders July, the flood and freeze-up', () => {
  const town = spaces.downtown
  const when: readonly (readonly ['summer' | 'flood' | 'freezeup', Clock])[] = [
    ['summer', '1967-07-14T23:00'],
    ['flood', '1967-08-15T09:00'],
    ['freezeup', '1967-10-15T12:00'],
  ]
  when.forEach(([s, c]) => {
    const props = propsIn(town, s, c)
    assert.deepEqual(props.slice(0, town.props.length), town.props, s)
    assert.deepEqual(props.slice(town.props.length), townLayer(s, c), s)
  })
  assert.deepEqual(solids(town, initialState), town.props.filter((p) => p.solid).map((p) => p.box), 'collision is the town alone')
})

test('only the town, in July or under either flood, and the help tent take a season layer', () => {
  Object.values(spaces)
    .filter((s) => s.id !== 'downtown' && s.id !== 'flood' && s.id !== 'line' && s.id !== 'helpTent')
    .forEach((s) => assert.equal(propsIn(s, 'freezeup', '1967-11-20T12:00'), s.props, s.id))
})

// Every dated scene in the story, in every act that has clocks: downtown shows that scene's season(state) and the
// freeze-up stage of its clock. When Act 2's scenes get their clocks, this covers freeze-up on the story's own path.
test('downtown is lit and dressed from season(state) at every dated scene', () => {
  const dated = sceneIds.map(at).filter((s) => clock(s) !== undefined)
  assert.ok(dated.length > 0)
  dated.forEach((s) => {
    const t = timeOf(spaces.downtown, s)
    const story = season(s)!
    assert.equal(t.season, story === 'breakup' ? 'winter' : story, s.scene)
    assert.equal(t.clock, clock(s))
    assert.equal(stageOf(t.season, t.clock), stageOf(story, clock(s)), s.scene)
  })
})

// A scene with no clock is in the season of the last dated scene before it, never a season a space made up.
test('an undated scene keeps the season of the last dated scene before it', () => {
  const undated = sceneIds.map(at).filter((s) => clock(s) === undefined && s.scene !== sceneIds[0])
  undated.forEach((s) => {
    const before = sceneIds
      .slice(0, sceneIds.indexOf(s.scene))
      .map(at)
      .findLast((x) => clock(x) !== undefined)
    const want = before ? season(before)! : 'summer'
    assert.deepEqual(timeOf(spaces.downtown, s), { season: want === 'breakup' ? 'winter' : want }, s.scene)
  })
})

// St. Joseph's in the flood (#169): the design sends the half-flooded hospital's patients and nurses to the help tent
// on high ground, so the place id #89 gives Act 1's hospital is `helpTent` (hospital.ts). Its cots, spawn and
// seasonal dressing are that space; Act 3's winter return (#145) fills the empty winter hook.
test("the Act 1 hospital's place id is a space with a clear spawn, and the errand path starts Wade there", () => {
  const id = spaceFor('Act 1: Flood', 'helpTent')
  assert.equal(id, 'helpTent')
  const tent = spaces[id!]
  assert.equal(blocked(tent.spawn, solids(tent)), false)
  const g = startFrom(`#path=${Array.from({ length: 10 }, () => 1).join(',')}`, '')
  assert.equal(place(g.story), 'helpTent')
  assert.equal(g.space, 'helpTent')
  assert.deepEqual(g.pos, tent.spawn)
})

test('the help tent renders in winter as its bare space, an empty variant', () => {
  const tent = spaces.helpTent
  const winter = propsIn(tent, 'winter', '1968-01-20T12:00')
  assert.deepEqual(winter, tent.props)
  assert.ok(winter.every((p) => [p.box.x, p.box.z, p.box.w, p.box.d, p.h].every(Number.isFinite)))
})

// The land office (#172): the wet ledger pile and the staircase Lucy hauls them up are solid, so Wade walks around
// them, not through them. Walked headless from where the `--choices` path to `a1_lucy` puts him.
const inOffice = startFrom(`#path=${Array.from({ length: 18 }, () => 1).join(',')}`, '')

test('the land office path puts Wade in the office space, at its spawn', () => {
  assert.equal(inOffice.space, 'office')
  assert.deepEqual(inOffice.pos, spaces.office.spawn)
})

test('Wade cannot walk through the wet ledger pile', () => {
  assert.throws(() => walk(inOffice, [[-3.5, -3.0], [-3.5, 0.0]]), /blocked/)
  assert.ok(blocked(PILE_AT, solids(spaces.office)))
})

test('Wade cannot walk through the staircase from the side of the room', () => {
  assert.throws(() => walk(inOffice, [[3.0, -1.0], [3.0, 0.5], [STAIR_X, 0.5]]), /blocked/)
  Array.from({ length: 10 }, (_, i) => vec(STAIR_X, -1.6 + 0.5 * (i + 0.5))).forEach((tread) =>
    assert.ok(blocked(tread, solids(spaces.office)), `tread at z ${tread.z}`),
  )
})

// #62: figures that wear a cast model carried a coat, skin and hair nothing drew. A cast figure names its model and
// carries no gray-box look; a gray box is never a cast member.
test('a figure is either a cast model or a gray box, never both', () => {
  const figures = Object.values(spaces).flatMap((s) => s.figures.map((f) => ({ space: s.id, f })))
  figures.forEach(({ space, f }) => {
    const where = `${space}/${f.id}`
    if (f.cast !== undefined) assert.deepEqual([f.coat, f.skin, f.hair], [undefined, undefined, undefined], `${where} wears ${f.cast} and a look`)
    else assert.equal(castFor(f.id), undefined, `${where} is a cast member but does not name its model`)
  })
  assert.ok(figures.some(({ f }) => f.cast !== undefined))
})

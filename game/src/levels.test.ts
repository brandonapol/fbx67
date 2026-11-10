import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import { clock, season } from '../../text-game/src/story.ts'
import type { Clock, SceneId, State } from '../../text-game/src/types.ts'
import { propsIn, solids, spaces } from './levels.ts'
import { timeOf } from './lighting.ts'
import { stageOf, townLayer } from './freezeup.ts'

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
  assert.deepEqual(solids(town), town.props.filter((p) => p.solid).map((p) => p.box), 'collision is the town alone')
})

test('only the town, in July or under the flood, and the help tent take a season layer', () => {
  Object.values(spaces)
    .filter((s) => s.id !== 'downtown' && s.id !== 'flood' && s.id !== 'helpTent')
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

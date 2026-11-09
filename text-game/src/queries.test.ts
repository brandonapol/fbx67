import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialState } from './state.ts'
import { sceneIds, sceneIndex } from './sceneIds.ts'
import { scenes } from './scenes/index.ts'
import { boughtRound, evidenceIds, notebook, oneHanded, pov, season, seasonOn } from './queries.ts'
import { replay } from './engine.ts'
import * as story from './story.ts'
import { lintText } from './storyLint.ts'
import type { Clock, Evidence, SceneId, State } from './types.ts'

const at = (scene: SceneId, patch: Partial<State> = {}): State => ({ ...initialState, scene, ...patch })

const everyEvidence: readonly Evidence[] = [
  'knot', 'bruising', 'aerialPhotos', 'hotelTalk', 'coFiles', 'curlyKnot',
  'tapes', 'wreckProof', 'curlyLefty', 'staffCar', 'curlyNamesAshby', 'councilmanFlips',
]

test('season at the boundary of each range', () => {
  const cases: readonly (readonly [Clock, string])[] = [
    ['1967-06-01T00:00', 'summer'],
    ['1967-07-15T07:30', 'summer'],
    ['1967-08-11T23:59', 'summer'],
    ['1967-08-12T00:00', 'flood'],
    ['1967-08-31T23:59', 'flood'],
    ['1967-09-01T00:00', 'freezeup'],
    ['1967-11-30T23:59', 'freezeup'],
    ['1967-12-01T00:00', 'winter'],
    ['1968-02-29T23:59', 'winter'],
    ['1968-03-01T00:00', 'breakup'],
    ['1968-05-31T23:59', 'breakup'],
    ['1968-06-01T00:00', 'summer'],
  ]
  cases.forEach(([clock, want]) => assert.equal(seasonOn(clock), want, clock))
})

test('every prologue clock has a season: summer, then the flood on August 14', () => {
  const prologue = scenes.filter((sc) => sc.act === 'Prologue')
  assert.ok(prologue.length > 0)
  prologue.forEach((sc) => {
    const want = sc.clock?.startsWith('1967-08') ? 'flood' : 'summer'
    assert.equal(season(at(sc.id)), want, sc.id)
  })
})

test('season is undefined where the scene has no clock, like clock', () => {
  const bare = scenes.find((sc) => sc.clock === undefined)
  assert.ok(bare)
  assert.equal(season(at(bare.id)), undefined)
  assert.equal(story.season(at(bare.id)), undefined)
})

test('every scene id has a pov: Owen in the prologue, Lucy in her scenes, Wade otherwise', () => {
  const lucy = ['a3_camp', 'a3_wrong_spot', 'a3_found', 'a3_crash', 'a3_survive_fire', 'a3_survive_jake']
  sceneIds.forEach((id) => {
    const want = id.startsWith('p_') ? 'owen' : lucy.includes(id) ? 'lucy' : 'wade'
    assert.equal(pov(at(id)), want, id)
  })
  assert.equal(story.pov(at('a3_search')), 'wade')
})

test('oneHanded is false before a3_arm and true from a3_arm onward, by scene order', () => {
  const arm = sceneIndex('a3_arm')
  sceneIds.forEach((id) => assert.equal(oneHanded(at(id)), sceneIndex(id) >= arm, id))
  assert.equal(oneHanded(at('a3_ski_up')), false)
  assert.equal(oneHanded(at('a3_arm')), true)
  assert.equal(oneHanded(at('end')), true)
  assert.equal(story.oneHanded(at('a4_wire')), true)
})

test('notebook is empty with no evidence and has one entry per piece held', () => {
  assert.deepEqual(notebook(initialState), [])
  const s = at('a2_curly', { evidence: ['knot', 'tapes'] })
  assert.deepEqual(notebook(s).map((e) => e.id), ['knot', 'tapes'])
})

test('every Evidence value has a notebook line (fails when a new id has none)', () => {
  assert.deepEqual([...evidenceIds].sort(), [...everyEvidence].sort())
  const lines = notebook(at('end', { evidence: everyEvidence })).map((e) => e.line)
  assert.equal(lines.length, everyEvidence.length)
  lines.forEach((l) => assert.match(l, /\S/))
})

test('notebook lines state what was seen, pass the oil rule, and render cleanly', () => {
  for (const scene of ['end', 'a3_found'] as const) {
    notebook(at(scene, { evidence: everyEvidence })).forEach(({ id, line }) => {
      assert.doesNotMatch(line, /oil rush|undefined|NaN/i, id)
      assert.doesNotMatch(line, /\bproof\b|\bkilled\b|\bmurder/i, id)
    })
  }
})

test('notebook speaks as Lucy in her scenes where it has a Lucy line', () => {
  const held: readonly Evidence[] = ['tapes', 'knot']
  const wade = notebook(at('a3_home', { evidence: held }))
  const lucy = notebook(at('a3_found', { evidence: held }))
  assert.notEqual(lucy[0].line, wade[0].line)
  assert.equal(lucy[1].line, wade[1].line)
})

test('boughtRound holds only in the scene the round leads to', () => {
  const states = replay([3, 1])
  assert.deepEqual(states.map((s) => [s.scene, boughtRound(s)]), [
    ['p_bar', false],
    ['p_talk_round', true],
    ['p_letter', false],
  ])
  assert.equal(boughtRound(replay([1]).at(-1)!), false)
})

// Like the scene lint, the name rule reads the source: rendered lines contain names.ts's placeholders by design.
test('the notebook source passes the story lint, oil rule on, since the notebook opens before Act 4', () => {
  const src = readFileSync(new URL('./queries.ts', import.meta.url), 'utf8')
  assert.deepEqual(lintText(src, true).map((v) => `queries.ts:${v.line} ${v.rule}: ${v.match}`), [])
})

test('every rendered notebook line, in either voice, passes the oil rule', () => {
  for (const scene of ['a2_curly', 'a3_found'] as const) {
    notebook(at(scene, { evidence: everyEvidence })).forEach(({ id, line }) =>
      assert.deepEqual(lintText(line, true).filter((v) => v.rule === 'oil'), [], id))
  }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allSceneIds, choicesOf, choose, follow, isEnd, registryProblems, render, replay, sceneOf } from './engine.ts'
import { BOUNDS, initialState } from './state.ts'
import { scenes } from './scenes/index.ts'
import { sceneIds } from './sceneIds.ts'
import { mulberry, pickIndex } from './random.ts'
import type { Choice, State } from './types.ts'

const walk = (seed: number): readonly State[] => {
  const rnd = mulberry(seed)
  const go = (s: State, acc: readonly State[]): readonly State[] => {
    const cs = choicesOf(s)
    return cs.length === 0 ? acc : ((n) => go(n, [...acc, n]))(follow(s, cs, pickIndex(rnd, cs.length)))
  }
  return go(initialState, [initialState])
}

test('the registry defines every scene id once, in play order', () => {
  assert.deepEqual(scenes.map((sc) => sc.id), [...sceneIds])
  assert.deepEqual(allSceneIds(), sceneIds)
  assert.deepEqual(registryProblems(sceneIds), [])
})

test('registry problems are reported', () => {
  assert.deepEqual(registryProblems(sceneIds.slice(1)).slice(0, 1), ['scene p_bar has no definition'])
  assert.ok(registryProblems([...sceneIds, 'end']).includes('scene end is defined twice'))
  assert.ok(registryProblems(['p_talk_texas', 'p_bar', ...sceneIds.slice(2)]).includes('scene p_talk_texas is out of play order'))
})

test('unknown scenes are rejected', () => {
  const bad: State = JSON.parse(JSON.stringify({ ...initialState, scene: 'nowhere' }))
  assert.throws(() => sceneOf(bad), /Unknown scene: nowhere/)
  assert.throws(() => render(bad), /Unknown scene: nowhere/)
})

test('choices outside the menu are rejected', () => {
  const n = choicesOf(initialState).length
  assert.throws(() => choose(initialState, 0), /Choice 0 is not available in p_bar/)
  assert.throws(() => choose(initialState, n + 1), new RegExp(`Choice ${n + 1} is not available in p_bar \\(1-${n}\\)`))
  assert.throws(() => choose(initialState, Number.NaN), /Choice NaN is not available/)
  assert.throws(() => choose(initialState, 1.5), /Choice 1.5 is not available/)
  assert.throws(() => replay([1, 99]), /Choice 99 is not available/)
})

test('a choice that points backwards is rejected', () => {
  const back: readonly Choice[] = [{ label: 'loop', next: 'p_bar' }]
  const atLetter: State = { ...initialState, scene: 'p_letter' }
  assert.throws(() => follow(atLetter, back, 1), /goes back to earlier scene p_bar/)
  assert.throws(() => follow(initialState, back, 1), /goes back to earlier scene p_bar/)
})

test('random games move strictly forward through the scene list and stay in bounds', () => {
  Array.from({ length: 500 }, (_, i) => walk(i + 1)).forEach((states, i) => {
    const idx = states.map((s) => sceneIds.indexOf(s.scene))
    idx.slice(1).forEach((x, j) => assert.ok(x > idx[j], `seed ${i + 1}: ${states[j].scene} -> ${states[j + 1].scene}`))
    assert.ok(isEnd(states[states.length - 1]))
    states.forEach((s) => {
      assert.ok(s.heat >= BOUNDS.heat[0] && s.heat <= BOUNDS.heat[1])
      assert.ok(s.lucyHeat >= BOUNDS.lucyHeat[0] && s.lucyHeat <= BOUNDS.lucyHeat[1])
      assert.ok(s.eliTrust >= BOUNDS.eliTrust[0] && s.eliTrust <= BOUNDS.eliTrust[1])
      assert.ok(s.joan >= BOUNDS.joan[0] && s.joan <= BOUNDS.joan[1])
      assert.ok(s.momHonesty >= BOUNDS.momHonesty[0] && s.momHonesty <= BOUNDS.momHonesty[1])
    })
  })
})

test('the end scene has no choices and renders THE END', () => {
  const last = walk(1).at(-1) ?? initialState
  assert.equal(last.scene, 'end')
  assert.match(render(last), /\[THE END\]/)
})

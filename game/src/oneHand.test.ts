import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { replay } from '../../text-game/src/engine.ts'
import { initialState } from '../../text-game/src/state.ts'
import { sceneIds, sceneIndex } from '../../text-game/src/sceneIds.ts'
import { oneHanded } from '../../text-game/src/story.ts'
import type { Verb as TalkVerb } from './talk.ts'
import type { Verb as FightVerb } from './fightControls.ts'
import type { Interaction } from './oneHand.ts'
import { hands, interactions, offer, playable, ruledOut } from './oneHand.ts'

const at = (scene: (typeof sceneIds)[number]) => ({ ...initialState, scene })

// Fails to compile if a verb the game already offers has no declaration here.
const talkVerbs: readonly TalkVerb[] = ['greet', 'talk', 'ask', 'buy', 'use']
const fightVerbs: readonly FightVerb[] = ['shove', 'grab', 'use']
const declared: readonly Interaction[] = [...talkVerbs, ...fightVerbs]

test('every interaction declares whether it works one-handed, and nothing else is declared', () => {
  assert.deepEqual(Object.keys(hands).sort(), [...interactions].sort())
  interactions.forEach((i) => assert.ok(hands[i].oneHand === 'works' || hands[i].oneHand === 'ruledOut', i))
  declared.forEach((i) => assert.ok(interactions.includes(i), i))
  assert.equal(new Set(interactions).size, interactions.length)
})

test('the ruled-out list is #88: climbing, driving a stick and shooting a rifle', () => {
  assert.deepEqual(interactions.filter(ruledOut), ['climb', 'driveStick', 'shootRifle'])
})

test('skiing, lock work and fine work are unchanged by the arm (#88)', () => {
  ;(['ski', 'pickLock', 'fineWork'] as const).forEach((i) => assert.equal(ruledOut(i), false, i))
})

test('each ruled-out interaction becomes what #88 names, never a verb that fails', () => {
  assert.deepEqual(hands.climb, { oneHand: 'ruledOut', instead: ['detour', 'helper'] })
  assert.deepEqual(hands.driveStick, { oneHand: 'ruledOut', instead: ['helper', 'staged'] })
  assert.deepEqual(hands.shootRifle, { oneHand: 'ruledOut', instead: ['staged'] })
})

test('before a3_arm every interaction is a verb; from it the three are changed or hidden', () => {
  const arm = sceneIndex('a3_arm')
  sceneIds.forEach((id) => {
    const s = at(id)
    interactions.forEach((i) => {
      const o = offer(s, i, ['detour', 'helper', 'staged'])
      assert.equal(o.kind === 'verb', sceneIndex(id) < arm || !ruledOut(i), `${id} ${i}`)
      assert.notEqual(o.kind, 'hidden', `${id} ${i}: every alternative is on hand`)
    })
  })
})

test('a ruled-out interaction takes the first alternative the place has, else it is hidden', () => {
  const s = at('a3_arm')
  assert.deepEqual(offer(s, 'climb', ['helper']), { kind: 'instead', via: 'helper' })
  assert.deepEqual(offer(s, 'climb', ['staged', 'detour']), { kind: 'instead', via: 'detour' })
  assert.deepEqual(offer(s, 'climb'), { kind: 'hidden' })
  assert.deepEqual(offer(s, 'shootRifle', ['helper', 'detour']), { kind: 'hidden' })
  assert.deepEqual(offer(s, 'driveStick', ['staged']), { kind: 'instead', via: 'staged' })
  assert.deepEqual(offer(s, 'ski'), { kind: 'verb' })
})

test('playable drops the ruled-out verbs once the arm is broken, and keeps the order', () => {
  const list: readonly Interaction[] = ['look', 'climb', 'pickLock', 'driveStick', 'ski', 'shootRifle']
  assert.deepEqual(playable(at('a3_ski_up'), list), list)
  assert.deepEqual(playable(at('a3_arm'), list), ['look', 'pickLock', 'ski'])
  assert.deepEqual(playable(at('end'), list), ['look', 'pickLock', 'ski'])
})

test('on the first golden route the arm follows the story: two hands on the ski in, one from the fall', () => {
  const golden = JSON.parse(readFileSync(new URL('../../text-game/routes/golden.json', import.meta.url), 'utf8'))
  const states = replay(golden[0].path.split(',').map(Number))
  const fall = states.findIndex((s) => s.scene === 'a3_arm')
  assert.ok(fall > 0, 'the route passes a3_arm')
  const [before, after] = [states[fall - 1], states[fall]]
  assert.equal(before.scene, 'a3_ski_down')
  assert.equal(oneHanded(before), false)
  assert.equal(oneHanded(after), true)
  assert.deepEqual(offer(before, 'climb'), { kind: 'verb' })
  assert.deepEqual(offer(after, 'climb'), { kind: 'hidden' })
  assert.deepEqual(offer(after, 'driveStick', ['helper']), { kind: 'instead', via: 'helper' })
  const burn = states.find((s) => s.scene === 'a3_rash_burn')
  assert.ok(burn, 'the route takes the cabin rash plan')
  assert.deepEqual(offer(burn, 'driveStick', ['staged']), { kind: 'instead', via: 'staged' })
})

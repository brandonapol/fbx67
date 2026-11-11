import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { menu } from './story.ts'
import type { State } from './types.ts'

// The epilogue's Eli and Joan lines read eliTrust >= 3 and joan >= 3 inline in scenes/end.ts. No gate test or fast
// story test covered either cut, so a moved threshold changed the ending text unnoticed until the golden replay.
const best: State = {
  ...initialState,
  scene: 'end',
  curlyPlan: 'warn',
  eliTrespass: 'quiet',
  afterConfession: 'stay',
  offer: 'refuse',
  testified: true,
  sharedWreck: true,
}

const text = (patch: Partial<State>): string => menu({ ...best, ...patch }).text

test('Eli names his boat after Owen at trust 3, and only nods below it', () => {
  assert.match(text({ eliTrust: 3 }), /names his new boat after Owen/)
  for (const t of [-3, 0, 2]) {
    assert.doesNotMatch(text({ eliTrust: t }), /names his new boat/, String(t))
    assert.match(text({ eliTrust: t }), /He nods at you on the street/, String(t))
  }
})

test('Joan waits a while at 3, and below it only marries the dentist', () => {
  assert.match(text({ joan: 3 }), /JOAN: Waits a while for you to stop choosing trouble/)
  for (const j of [0, 2]) assert.match(text({ joan: j }), /JOAN: Marries a dentist\./, String(j))
})

test('taking the offer overrides Joan\'s line whatever her count', () => {
  for (const j of [0, 3]) assert.match(text({ joan: j, offer: 'take' }), /JOAN: Marries you in the fall/, String(j))
})

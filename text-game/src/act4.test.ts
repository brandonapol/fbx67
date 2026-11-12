import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { act4 } from './scenes/act4.ts'
import { menu } from './story.ts'
import { iceJam } from './logic.ts'
import type { State } from './types.ts'

const at = (scene: State['scene'], patch: Partial<State> = {}): State => ({ ...initialState, scene, ...patch })

// One state per Act 4 route: the offer taken, refused or faked, each with Wade honest with his friends or not, so
// both sides of every branch (the wire, the ice jam, the testimony) render.
const honest: Partial<State> = { eliTrespass: 'quiet', afterConfession: 'stay' }
const routes: readonly Partial<State>[] = (['take', 'refuse', 'fake'] as const).flatMap((offer) => [
  { offer },
  { offer, ...honest },
])
const everyMenu = act4.flatMap((sc) => routes.map((r) => menu(at(sc.id, r))))

test('every Act 4 choice names its note', () => {
  const unnamed = everyMenu.flatMap((m) => m.options.filter((o) => /^option\d+$/.test(o.note)).map((o) => `${m.scene}: ${o.label}`))
  assert.deepEqual([...new Set(unnamed)], [])
})

test('the Act 4 menus send the notes the engine plan names', () => {
  const notes = (scene: string, patch: Partial<State> = {}): readonly string[] =>
    menu(at(scene as State['scene'], patch)).options.map((o) => o.note)
  assert.deepEqual(notes('a4_offer'), ['take', 'refuse', 'fake'])
  assert.deepEqual(notes('a4_chase'), ['jump', 'logs'])
  assert.deepEqual(notes('a4_struggle'), ['shoulder', 'talk'])
  assert.deepEqual(notes('a4_defuse'), ['cap', 'cut', 'freeze'])
  assert.deepEqual(notes('a4_testify', { offer: 'take' }), ['silent', 'testify'])
  assert.deepEqual(notes('a4_testify', { offer: 'refuse' }), ['testify', 'silent'])
  assert.deepEqual(notes('a4_news'), ['continue'])
})

// Design, "Broken arm": the arm is out of use, so the ice jam's attack is a shoulder charge, never the cast.
test('a4_struggle offers a shoulder charge, and no Act 4 text has Wade swing or hit with the cast', () => {
  const struggle = menu(at('a4_struggle'))
  assert.match(struggle.options[0]?.label ?? '', /shoulder/i)
  const wadeUsesCast = /\b(you|your good hand)\b[^.!?"]*\b(swing|hit|club|strike)\b[^.!?"]*\bcast\b/i
  const orderUsesCast = /^(swing|hit|club|strike)\b[^.!?]*\bcast\b/i
  const found = everyMenu.flatMap((m) => [
    ...(wadeUsesCast.test(m.text) ? [`${m.scene} text`] : []),
    ...m.options.filter((o) => orderUsesCast.test(o.label)).map((o) => `${m.scene}: ${o.label}`),
  ])
  assert.deepEqual([...new Set(found)], [])
})

// The ratchet keys a note by its sender: one id per route, so the chase and the blown camp are not one key.
test("a4_icejam's note differs by route", () => {
  const stopped = at('a4_icejam', { offer: 'refuse', ...honest })
  const blown = at('a4_icejam', { offer: 'take', ...honest })
  assert.equal(iceJam(stopped), 'stopped')
  assert.equal(iceJam(blown), 'blown')
  assert.deepEqual(menu(stopped).options.map((o) => o.note), ['chase'])
  assert.deepEqual(menu(blown).options.map((o) => o.note), ['continue'])
})

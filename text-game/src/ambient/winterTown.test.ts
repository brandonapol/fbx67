import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { SceneId, State } from '../types.ts'
import type { Bit } from './format.ts'
import { winterTown } from './winterTown.ts'
import { act2 } from '../scenes/act2.ts'
import { act3 } from '../scenes/act3.ts'
import { initialState } from '../state.ts'
import { HEAT_LIMIT } from '../logic.ts'
import { weather } from '../story.ts'
import { lintText } from '../storyLint.ts'
import { lintAmbient } from './lint.ts'
import { here } from './select.ts'
import { pov } from '../queries.ts'

// Content checks for the town in freeze-up and deep winter (#108: #154, #155). The format's own lint (#42) runs over
// the cast against every Act 2 and Act 3 scene, each under all three moral weathers; these pin what this cast promises:
// the groups the tickets ask for, that every line can be heard, that Wade is the one replying, and that nobody but the
// café gossip tells him where he stands. All three weathers are reached at every scene this cast stands in (the sweep
// through placedStates() finds clear, dusk and night at each), so the weather variants below are real states.

const source = readFileSync(new URL('./winterTown.ts', import.meta.url), 'utf8')

// Heat 0 is clear, one under the limit is dusk, over it is night.
const heats = [0, HEAT_LIMIT - 1, HEAT_LIMIT + 1] as const
const states: readonly State[] = [...act2, ...act3].flatMap((sc) => heats.map((heat) => ({ ...initialState, scene: sc.id, heat })))
const ids = new Set(winterTown.map((p) => p.id))
const bits = winterTown.flatMap((p) => Object.values(p.lines).flatMap((pool) => pool.map((b) => ({ p, b }))))
const said = (b: Bit) => [...b.lines, ...(b.reply?.lines ?? [])]
const texts: readonly string[] = [
  ...bits.flatMap(({ b }) => said(b).map((l) => l.text)),
  ...bits.flatMap(({ b }) => (b.reply ? [b.reply.label] : [])),
]
const heard = (b: Bit, at: (s: State) => boolean) => states.filter((s) => at(s) && (b.when?.(s) ?? true))
const person = (id: string) => winterTown.find((p) => p.id === id)!
const scenesOf = (id: string): readonly SceneId[] => [...new Set(states.filter((s) => here(s, person(id))).map((s) => s.scene))]

test('the moral weathers the states stand for are the three weather() gives', () => {
  assert.deepEqual(heats.map((heat) => weather({ ...initialState, heat })), ['clear', 'dusk', 'night'])
})

test('the ambient lint passes over the whole cast in every Act 2 and Act 3 scene', () => {
  assert.deepEqual(lintAmbient(winterTown, [], source, states), [])
})

test('every person has a role, a want, a habit and 3 to 8 lines, under a unique id', () => {
  assert.equal(ids.size, winterTown.length)
  for (const p of winterTown) {
    for (const k of ['role', 'want', 'habit'] as const) assert.ok(p[k].length > 0, `${p.id}.${k}`)
    const n = Object.values(p.lines).reduce((sum, pool) => sum + pool.length, 0)
    assert.ok(n >= 3 && n <= 8, `${p.id} has ${n}`)
  }
})

test("the tickets' groups are all in town, each at the place and hour of its scenes", () => {
  const groups: Readonly<Record<string, readonly [readonly string[], readonly SceneId[]]>> = {
    'the duty desk': [['dutyClerk'], ['a2_major']],
    'the photo-lab clerk with the long lunch': [['labClerk'], ['a2_photos']],
    'the barracks': [['airmanBunk', 'airmanJersey', 'shortTimer'], ['a2_co_lucy', 'a2_letter_work', 'a2_letter_friends']],
    'the hangar': [['crewChief'], ['a2_jake']],
    'the hotel crowd': [['hotelBartender', 'hotelWaitress', 'professorWhite', 'professorBlack', 'contractor'], ['a2_hotel_set', 'a2_hotel_heard', 'a2_hotel_pieces']],
    'the bush strip': [['pilotYoung'], ['a2_curly']],
    'the Silver Pan in November': [['miner', 'barflyRiver'], ['a2_steak', 'a2_confront', 'a2_confront_knot']],
    'the café regulars in freeze-up': [['cook', 'landClerk', 'pilotGray'], ['a2_co_gossip', 'a2_heat_gossip']],
    'the café regulars in deep winter': [['waitress', 'landlady', 'reporter', 'paperKid'], ['a3_rash_gossip']],
    "St. Joseph's in winter": [['sister', 'orderly', 'doctor', 'trapper'], ['a3_home', 'a3_curly', 'a3_joan']],
    'the hospital lot at forty below': [['plugIn', 'cabbie'], ['a3_eli']],
  }
  const placed = Object.values(groups).flatMap(([people]) => people)
  assert.deepEqual([...placed].sort(), [...ids].sort(), 'every person is in exactly one group')
  for (const [group, [people, scenes]] of Object.entries(groups))
    for (const id of people) assert.deepEqual([...scenesOf(id)].sort(), [...scenes].sort(), `${group}: ${id}`)
})

test('nobody stands in a heist, on the hill, in a kitchen or at a confession', () => {
  const quiet: readonly SceneId[] = ['a2_co_heist', 'a2_co_found', 'a2_co_seen', 'a2_hotel', 'a2_co_ask', 'a2_flight', 'a3_search', 'a3_arm', 'a3_wreck', 'a3_rash', 'a3_confession', 'a3_walk']
  assert.deepEqual(winterTown.filter((p) => quiet.some((sc) => scenesOf(p.id).includes(sc))).map((p) => p.id), [])
})

test('the regulars who carry over are the same people as in the prologue and the flood', () => {
  const before = readFileSync(new URL('./prologueTown.ts', import.meta.url), 'utf8') + readFileSync(new URL('./floodTown.ts', import.meta.url), 'utf8')
  for (const id of ['airmanBunk', 'airmanJersey', 'miner', 'barflyRiver', 'cook', 'landClerk', 'pilotGray', 'pilotYoung', 'waitress', 'landlady', 'reporter', 'paperKid', 'sister', 'orderly', 'doctor', 'cabbie'])
    assert.ok(before.includes(`id: '${id}'`), id)
})

test('every line can be heard in some Act 2 or Act 3 scene, and each weather line only under its weather', () => {
  const unheard = bits.filter(({ p, b }) => heard(b, (s) => here(s, p)).length === 0).map(({ p, b }) => `${p.id}.${b.id}`)
  assert.deepEqual(unheard, [])
  const skies = bits.filter(({ b }) => b.when !== undefined && new Set(heard(b, () => true).map(weather)).size === 1)
  assert.deepEqual(
    skies.map(({ p, b }) => `${p.id}.${b.id}:${weather(heard(b, () => true)[0])}`).sort(),
    ['airmanBunk.blue:dusk', 'airmanBunk.fog:night', 'airmanBunk.pink:clear', 'plugIn.alpenglow:clear', 'plugIn.blue:dusk', 'plugIn.fog:night', 'waitress.fog:night', 'waitress.ham:clear', 'waitress.supper:dusk'],
  )
})

test('the short-timer counts down between October and November', () => {
  const greet = (sc: SceneId) =>
    person('shortTimer')
      .lines.greet!.filter((b) => b.when!({ ...initialState, scene: sc }))
      .map((b) => b.id)
  assert.deepEqual(greet('a2_co_lucy'), ['fiftyone'])
  assert.deepEqual(greet('a2_letter_work'), ['twentytwo'])
})

test('Wade gives every reply, and every line is heard as Wade', () => {
  for (const { b } of bits) for (const l of said(b)) assert.ok(l.by === 'wade' || l.by === 'them', `${b.id}: ${l.by}`)
  for (const p of winterTown) for (const s of states.filter((s) => here(s, p))) assert.equal(pov(s), 'wade', `${p.id} at ${s.scene}`)
})

test('nobody says oil or tells Wade where he stands, and names come from names.ts', () => {
  assert.deepEqual(lintText(source, true), [])
  assert.deepEqual(texts.filter((t) => /\boil\b/i.test(t)), [])
  const standing = /\b(trust|trusts|reputation|heat|watching you|your name|Barnette|trooper|troopers|police|cops?|the law|list)\b/i
  assert.deepEqual(texts.filter((t) => standing.test(t)), [])
})

test('ambient talk reads State and never changes it', () => {
  for (const s of states) {
    const frozen = structuredClone(s)
    for (const { b } of bits) b.when?.(s)
    assert.deepEqual(s, frozen)
  }
})

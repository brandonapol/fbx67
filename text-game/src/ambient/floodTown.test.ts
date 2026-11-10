import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { SceneId, State } from '../types.ts'
import type { Bit } from './format.ts'
import { floodTown } from './floodTown.ts'
import { act1 } from '../scenes/act1.ts'
import { initialState } from '../state.ts'
import { lintText } from '../storyLint.ts'
import { lintAmbient } from './lint.ts'
import { here } from './select.ts'
import { pov } from '../queries.ts'

// Content checks for the flooded town (#107). The format's own lint (#42) runs over the cast against every Act 1
// scene; these pin what this cast promises: the groups the ticket asks for, that every line can be heard, that Wade
// is the one replying, and that nobody tells him where he stands.

const source = readFileSync(new URL('./floodTown.ts', import.meta.url), 'utf8')

const states: readonly State[] = act1.map((sc) => ({ ...initialState, scene: sc.id }))
const ids = new Set(floodTown.map((p) => p.id))
const bits = floodTown.flatMap((p) => Object.values(p.lines).flatMap((pool) => pool.map((b) => ({ p, b }))))
const said = (b: Bit) => [...b.lines, ...(b.reply?.lines ?? [])]
const texts: readonly string[] = [
  ...bits.flatMap(({ b }) => said(b).map((l) => l.text)),
  ...bits.flatMap(({ b }) => (b.reply ? [b.reply.label] : [])),
]
const heard = (b: Bit, at: (s: State) => boolean) => states.filter((s) => at(s) && (b.when?.(s) ?? true))

test('the ambient lint passes over the whole cast in every Act 1 scene', () => {
  assert.deepEqual(lintAmbient(floodTown, [], source, states), [])
})

test('every person has a role, a want, a habit and 3 to 8 lines, under a unique id', () => {
  assert.equal(ids.size, floodTown.length)
  for (const p of floodTown) {
    for (const k of ['role', 'want', 'habit'] as const) assert.ok(p[k].length > 0, `${p.id}.${k}`)
    const n = Object.values(p.lines).reduce((sum, pool) => sum + pool.length, 0)
    assert.ok(n >= 3 && n <= 8, `${p.id} has ${n}`)
  }
})

test("the ticket's groups are all in town, each at the place and hour of its scenes", () => {
  const at = (id: string) => states.filter((s) => here(s, floodTown.find((p) => p.id === id)!)).map((s) => s.scene)
  const groups: Readonly<Record<string, readonly string[]>> = {
    'the prologue town, flooded out': ['landlady', 'boarder', 'waitress', 'reporter', 'preacher', 'paperKid', 'dockHand', 'touristHusband'],
    'airmen on sandbag duty': ['airmanBunk', 'airmanTailgate', 'airmanJersey'],
    'a family on a roof': ['roofFather', 'roofMother', 'roofBoy'],
    "St. Joseph's staff": ['sister', 'orderly', 'doctor'],
    'the land office crew': ['landClerk', 'recordsMan', 'summerClerk'],
    'barflies after the water goes down': ['nightBartender', 'miner', 'foreman', 'pilotGray', 'barflyRiver'],
  }
  const scene: Readonly<Record<string, SceneId>> = {
    'the prologue town, flooded out': 'a1_flood',
    'airmen on sandbag duty': 'a1_line',
    'a family on a roof': 'a1_track',
    "St. Joseph's staff": 'a1_ruling',
    'the land office crew': 'a1_lucy',
    'barflies after the water goes down': 'a1_barfight',
  }
  for (const [group, people] of Object.entries(groups))
    for (const id of people) assert.ok(at(id).includes(scene[group]), `${group}: ${id} at ${scene[group]}`)
  const spot = (id: string) => floodTown.find((p) => p.id === id)!.at.map((w) => w.spot)
  for (const id of groups['airmen on sandbag duty']) assert.deepEqual(spot(id), ['cushman'], id)
  for (const id of groups['a family on a roof']) assert.deepEqual(spot(id), ['lacey'], id)
  const prologue = readFileSync(new URL('./prologueTown.ts', import.meta.url), 'utf8')
  for (const id of groups['the prologue town, flooded out']) assert.ok(prologue.includes(`id: '${id}'`), `${id} is from #45`)
})

test('the Nenana boat only comes in once Eli has the message', () => {
  const boat = floodTown.find((p) => p.id === 'nenanaBoatman')!
  assert.deepEqual(states.filter((s) => here(s, boat)).map((s) => s.scene), ['a1_delivered', 'a1_line'])
})

test('every line can be heard in some Act 1 scene', () => {
  const unheard = bits.filter(({ p, b }) => heard(b, (s) => here(s, p)).length === 0).map(({ p, b }) => `${p.id}.${b.id}`)
  assert.deepEqual(unheard, [])
})

test('Wade gives every reply, and every line is heard as Wade', () => {
  for (const { b } of bits) for (const l of said(b)) assert.ok(l.by === 'wade' || l.by === 'them', `${b.id}: ${l.by}`)
  assert.ok(states.every((s) => pov(s) === 'wade'))
})

test('the sandbag line has lines only for the airman who came back from looking for Eli', () => {
  const back = bits.filter(({ b }) => b.when !== undefined && heard(b, () => true).every((s) => s.scene === 'a1_line'))
  assert.deepEqual(back.map(({ p, b }) => `${p.id}.${b.id}`).sort(), ['airmanBunk.latrine', 'airmanTailgate.sarge'])
})

test('nobody says oil or tells Wade where he stands, and names come from names.ts', () => {
  assert.deepEqual(lintText(source, true), [])
  assert.deepEqual(texts.filter((t) => /\boil\b/i.test(t)), [])
  const standing = /\b(trust|trusts|reputation|heat|watching you|your name)\b/i
  assert.deepEqual(texts.filter((t) => standing.test(t)), [])
})

test('ambient talk reads State and never changes it', () => {
  for (const s of states) {
    const frozen = structuredClone(s)
    for (const { b } of bits) b.when?.(s)
    assert.deepEqual(s, frozen)
  }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Body, Exposure } from './survival.ts'
import { BOUGHS, FUMBLE, WARMEST, fresh, sheltered } from './survival.ts'
import { HANDS_AT_FIRE, HANDS_IN_PARKA, WRAP_FEET, aidSeconds, canTend, cured, tend } from './lucyAid.ts'

// Lucy's first aid on herself (lucyAid.ts, #218): it spends fire time, it brings the part back, and it is bounded.

const white: Body = { ...fresh, warmth: 2.5, hands: 'white', bare: 50 }
const numb: Body = { ...fresh, warmth: 2.5, feet: 'numb' }
const open: Exposure = { ...sheltered, open: true }
const fire = { fuel: 2 * BOUGHS }

test('warming her hands at the fire spends its time and brings her fingers back', () => {
  const t = tend(white, 'hands', open, fire)!
  assert.equal(t.seconds, HANDS_AT_FIRE)
  assert.equal(t.fire?.fuel, fire.fuel - HANDS_AT_FIRE, 'the fire burns while she sits at it')
  assert.equal(t.body.hands, 'fine')
  assert.equal(t.body.bare, 0)
  assert.ok(t.body.warmth > white.warmth, 'at the fire she warms too')
})

test('with no fire her hands go inside her parka: slower, and the cold keeps working on her', () => {
  const t = tend(white, 'hands', open)!
  assert.equal(t.seconds, HANDS_IN_PARKA)
  assert.equal(t.fire, undefined)
  assert.equal(t.body.hands, 'fine')
  assert.ok(t.body.warmth < white.warmth)
  assert.ok(HANDS_IN_PARKA > HANDS_AT_FIRE)
})

test('a fire too low to last it is no fire to warm at', () => {
  const t = tend(white, 'hands', open, { fuel: HANDS_AT_FIRE - 1 })!
  assert.equal(t.seconds, HANDS_IN_PARKA)
  assert.equal(t.fire?.fuel, 0, 'it burns out while she waits, never below empty')
})

test('her feet are wrapped only at a fire; white hands fumble the laces and the knot', () => {
  assert.equal(tend(numb, 'feet', open), undefined)
  assert.equal(tend(numb, 'feet', open, { fuel: WRAP_FEET - 1 }), undefined)
  const t = tend(numb, 'feet', open, fire)!
  assert.equal(t.seconds, WRAP_FEET)
  assert.equal(t.body.feet, 'fine')
  assert.equal(t.fire?.fuel, fire.fuel - WRAP_FEET)
  assert.equal(aidSeconds({ ...numb, hands: 'white' }, 'feet', true), WRAP_FEET * FUMBLE)
})

test('bounded: nothing to treat is no aid, warmth never passes warm, and a freezing body keeps its frostbite', () => {
  assert.equal(tend(fresh, 'hands', open, fire), undefined)
  assert.equal(tend(fresh, 'feet', open, fire), undefined)
  assert.equal(canTend(white, 'feet', fire), false)
  const hot = tend({ ...white, warmth: WARMEST }, 'hands', open, fire)!
  assert.equal(hot.body.warmth, WARMEST)
  const freezing: Body = { ...white, warmth: 0.5, feet: 'numb' }
  assert.deepEqual(cured(freezing, 'hands'), freezing)
  assert.deepEqual(cured(freezing, 'feet'), freezing)
  assert.equal(tend(freezing, 'hands', { ...open, wind: true })!.body.hands, 'white', 'not thawed only to freeze again')
})

test('no rule copied from survival.ts: its numbers are imported, not restated', () => {
  const src = readFileSync(new URL('./lucyAid.ts', import.meta.url), 'utf8')
  assert.match(src, /from '\.\/survival\.ts'/)
  for (const name of ['BARE_LIMIT', 'FIRE_CLIMB', 'FIRE_REACH', 'FUMBLE', 'SHARE', 'WARMEST']) {
    assert.doesNotMatch(src, new RegExp(`(const|let) ${name}\\b`), name)
  }
  assert.doesNotMatch(src, /Wade/)
})

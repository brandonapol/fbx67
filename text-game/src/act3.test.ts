import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render, replay } from './engine.ts'
import { clock, place } from './story.ts'
import type { State } from './types.ts'

// From the prologue to a3_rash. Choice 26 is a2_co_ask: 1 searches the Major's cabinet (coJob 'wade', then the heist
// and what's in it), 2 refuses and Lucy goes herself (coJob 'lucy', one scene).
const toRash = [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
const lucyToRash = [...toRash.slice(0, 25), 2, 1, ...toRash.slice(28)]
const plans = ['safe', 'burn', 'gunpoint', 'none'] as const

const last = (path: readonly number[]): State => replay(path).at(-1) as State

test('both routes reach the rash plan with the cabinet job they took', () => {
  assert.equal(last(toRash).scene, 'a3_rash')
  assert.equal(last(toRash).coJob, 'wade')
  assert.equal(last(lucyToRash).scene, 'a3_rash')
  assert.equal(last(lucyToRash).coJob, 'lucy')
})

// #339: when Wade searched the cabinet himself, nobody saw a woman on the base, and the photographs are his.
test('turning on Lucy names the woman on the base only if she was seen there', () => {
  const turn = (path: readonly number[]): State => last([...path, 1, 1, 3])
  const [wade, lucy] = [turn(toRash), turn(lucyToRash)]
  assert.equal(wade.scene, 'a3_turn')
  assert.equal(lucy.scene, 'a3_turn')
  assert.doesNotMatch(render(wade), /woman on the base/)
  assert.match(render(wade), /photographs you took/)
  assert.match(render(lucy), /Native woman on the base/)
})

test('turning on Lucy leaves her own standing with the law where it was', () => {
  const after = (path: readonly number[]): State => last([...path, 1, 1, 3, 1])
  assert.equal(after(toRash).scene, 'a3_joan')
  assert.equal(after(toRash).lucyHeat, last(toRash).lucyHeat)
  assert.equal(after(lucyToRash).lucyHeat, last(lucyToRash).lucyHeat)
})

// #340: Lucy can't get onto the base, so staying out of it never puts her at Wade's barracks window.
test('staying out of it meets Lucy off the base', () => {
  const out = replay([...toRash, 4, 1])
  const [none, confession] = out.slice(-2)
  assert.equal(none.scene, 'a3_rash_none')
  assert.doesNotMatch(render(none), /window/)
  assert.notEqual(place(confession), 'eielsonBarracks')
})

// #341: Lucy steps out of the dark where the plan was headed, not back in the barracks.
test('Lucy stops each rash plan where it happens, minutes after it starts', () => {
  plans.forEach((plan, i) => {
    const [rash, confession] = replay([...toRash, i + 1, 1]).slice(-2)
    assert.equal(rash.rashPlan, plan)
    if (plan !== 'none') assert.equal(place(confession), place(rash), plan)
    const minutes = (Date.parse(clock(confession)!) - Date.parse(clock(rash)!)) / 60_000
    assert.ok(minutes > 0 && minutes <= 60, `${plan}: ${clock(rash)} to ${clock(confession)}`)
  })
})

// Walking out on Lucy leaves Wade off base, one-handed and without a car: a3_walk says how he gets back.
test('walking away gets Wade back to base from wherever Lucy stopped him', () => {
  const walk = (plan: number): string => render(last([...toRash, plan, 1, 2]))
  assert.match(walk(2), /fuel truck/)
  ;[1, 3, 4].forEach((plan) => assert.match(walk(plan), /cab off Second Avenue/))
})

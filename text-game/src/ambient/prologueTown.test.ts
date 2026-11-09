import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { State } from '../types.ts'
import type { Bit, Window } from './format.ts'
import { prologueThreads, prologueTown } from './prologueTown.ts'
import { prologue } from '../scenes/prologue.ts'
import { initialState } from '../state.ts'
import { clock, place } from '../story.ts'
import { lintText } from '../storyLint.ts'
import { lintAmbient } from './lint.ts'

// Content checks for the prologue's town (#45). The format's own lint (#42) runs over every cast; these pin what
// this cast promises: who is in it, that every line can be heard, and the foreshadowing threads.

const source = readFileSync(new URL('./prologueTown.ts', import.meta.url), 'utf8')
const design = readFileSync(new URL('../../../design.md', import.meta.url), 'utf8')

const states: readonly State[] = prologue.map((sc) => ({ ...initialState, scene: sc.id }))
const ids = new Set(prologueTown.map((p) => p.id))
const bar = prologueTown.find((p) => p.id === 'hank')!.at

const inWindow = (w: Window, s: State): boolean => {
  const c = clock(s)
  return place(s) === w.place && c !== undefined && w.from <= c && c <= w.to
}
const heardAt = (at: readonly Window[], b: Bit): readonly State[] =>
  states.filter((s) => at.some((w) => inWindow(w, s)) && (b.when?.(s) ?? true))

const bits = prologueTown.flatMap((p) => Object.values(p.lines).flatMap((pool) => pool.map((b) => ({ p, b }))))
const texts: readonly string[] = [
  ...bits.flatMap(({ b }) => [...b.lines, ...(b.reply?.lines ?? [])].map((l) => l.text)),
  ...bits.flatMap(({ b }) => (b.reply ? [b.reply.label] : [])),
  ...prologueThreads.flatMap((t) => t.lines.map((l) => l.text)),
]

test('the ambient lint passes over the whole cast and its threads', () => {
  assert.deepEqual(lintAmbient(prologueTown, prologueThreads, source), [])
})

test('the town has about 25 people, each with a role, a want and a habit', () => {
  assert.ok(prologueTown.length >= 20 && prologueTown.length <= 30, `${prologueTown.length} people`)
  assert.equal(ids.size, prologueTown.length, 'ids are unique')
  for (const p of prologueTown) for (const k of ['role', 'want', 'habit'] as const) assert.ok(p[k].length > 0, `${p.id}.${k}`)
})

test('each person has 3 to 8 lines across their pools', () => {
  for (const p of prologueTown) {
    const n = Object.values(p.lines).reduce((sum, pool) => sum + pool.length, 0)
    assert.ok(n >= 3 && n <= 8, `${p.id} has ${n}`)
  }
})

test('nobody in the prologue says oil, and names come from names.ts', () => {
  assert.deepEqual(lintText(source, true), [])
  assert.deepEqual(texts.filter((t) => /\boil\b/i.test(t)), [])
})

test('every line fits a subtitle and has no placeholder tokens', () => {
  assert.deepEqual(texts.filter((t) => t.length > 120), [])
  assert.deepEqual(texts.filter((t) => /\$\{|undefined|NaN|TODO|TBD|XXX/.test(t)), [])
})

test('every line can be heard at some prologue scene, place and time', () => {
  const unheard = bits.filter(({ p, b }) => heardAt(p.at, b).length === 0).map(({ p, b }) => `${p.id}.${b.id}`)
  assert.deepEqual(unheard, [])
})

test('some bar lines change after Owen buys the round', () => {
  const after = bits.filter(({ b }) => b.when !== undefined && heardAt(bar, b).every((s) => s.scene === 'p_talk_round'))
  const before = bits.filter(({ b }) => b.when !== undefined && heardAt(bar, b).every((s) => s.scene !== 'p_talk_round'))
  assert.ok(after.filter(({ b }) => heardAt(bar, b).length > 0).length >= 4, 'lines only after the round')
  assert.ok(before.filter(({ b }) => heardAt(bar, b).length > 0).length >= 2, 'lines only before it')
})
test('ask-about topics are what Owen knows', () => {
  const topics = new Set(prologueTown.flatMap((p) => Object.keys(p.lines).filter((k) => k.startsWith('askAbout:'))))
  assert.deepEqual([...topics].sort(), ['askAbout:curly', 'askAbout:landOffice', 'askAbout:survey', 'askAbout:weather'])
})

test('three overheard threads, each spoken by people who are there', () => {
  assert.deepEqual(prologueThreads.map((t) => t.id), ['gravelCash', 'shortCount', 'whichRoom'])
  for (const t of prologueThreads) {
    assert.ok(states.some((s) => inWindow(t.at, s)), `${t.id} can be overheard`)
    for (const l of t.lines) {
      assert.ok(ids.has(l.who), `${t.id}: ${l.who}`)
      const who = prologueTown.find((p) => p.id === l.who)!
      assert.ok(who.at.some((w) => w.place === t.at.place), `${l.who} is at ${t.at.place}`)
    }
  }
})

test('design.md lists each thread under the act that pays it off', () => {
  for (const t of prologueThreads) {
    const start = design.toLowerCase().indexOf(`**${t.paysOff.toLowerCase()}`)
    assert.ok(start >= 0, t.paysOff)
    const end = design.indexOf('\n**', start + 2)
    assert.ok(design.slice(start, end < 0 ? undefined : end).includes(`\`${t.id}\``), `${t.id} under ${t.paysOff}`)
  }
})

test('ambient talk reads State and never changes it', () => {
  for (const s of states) {
    const frozen = structuredClone(s)
    for (const { b } of bits) b.when?.(s)
    assert.deepEqual(s, frozen)
  }
})

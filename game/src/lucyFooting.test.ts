import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Ground } from './lucyFooting.ts'
import { GROUNDS, footing, sureFooted } from './lucyFooting.ts'

// Lucy's sure footing in snow (lucyFooting.ts, #218 follow-up C): where a stranger to snow breaks through, turns an
// ankle or slips, she keeps her pace and her stride; only a drift takes her down to a wade, and less than him.

test('only Lucy is sure-footed: the story pov, never a scene', () => {
  assert.equal(sureFooted('lucy'), true)
  assert.equal(sureFooted('wade'), false)
  assert.equal(sureFooted('owen'), false)
})

test('on crust, rough ground, ice and a slope she walks and runs as on the bar; Wade cannot run and is slowed', () => {
  const firm: readonly Ground[] = ['crust', 'rough', 'ice', 'slope']
  firm.forEach((g) => {
    assert.deepEqual(footing(true, g), { pace: 1, run: true }, `Lucy on ${g}`)
    const w = footing(false, g)
    assert.equal(w.run, false, `Wade runs on ${g}`)
    assert.ok(w.pace < 1, `Wade at full pace on ${g}`)
  })
})

test('a drift slows her too, but she wades it faster than he does; no one runs in one', () => {
  const [her, him] = [footing(true, 'drift'), footing(false, 'drift')]
  assert.equal(her.run, false)
  assert.ok(her.pace < 1)
  assert.ok(him.pace < her.pace)
})

test('on every ground she is at least as quick as he is, and the paces are bounded', () => {
  GROUNDS.forEach((g) => {
    const [her, him] = [footing(true, g), footing(false, g)]
    assert.ok(her.pace >= him.pace, g)
    assert.ok(her.run || !him.run, g)
    ;[her, him].forEach((f) => assert.ok(f.pace > 0 && f.pace <= 1, `${g}: ${f.pace}`))
  })
})

test('the rule is pure: same answer every call, frozen data, and nothing imported but types', () => {
  GROUNDS.forEach((g) => [true, false].forEach((s) => assert.deepEqual(footing(s, g), footing(s, g))))
  assert.ok(Object.isFrozen(footing(true, 'crust')))
  const src = readFileSync(new URL('./lucyFooting.ts', import.meta.url), 'utf8')
  const imports = src.split('\n').filter((l) => l.startsWith('import'))
  assert.ok(imports.every((l) => l.startsWith('import type')), imports.join('\n'))
  assert.doesNotMatch(src, /\blet\b|Math\.random|Date\.|performance|window|document/)
})

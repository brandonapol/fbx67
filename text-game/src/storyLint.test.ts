import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { lintText, STRICT } from './storyLint.ts'

// The lint reads scene sources, not rendered text: rendered text contains the names from names.ts by design, so
// only the source can tell `${N.co}` from a literal "Major Dekker". Reading sources also covers every branch.
const dir = new URL('./scenes/', import.meta.url)
const fromAct4 = new Set(['act4.ts', 'end.ts'])
// TODO(#347): these still type "Pruett"; other tasks are editing them. Remove the entries as they move to N.wadeLast.
const STRICT_DEFERRED = new Set(['act2.ts', 'act3.ts', 'act4.ts', 'end.ts'])

test('scene sources follow the oil rule and read placeholder names from names.ts', () => {
  const found = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .flatMap((f) =>
      lintText(readFileSync(new URL(f, dir), 'utf8'), !fromAct4.has(f), STRICT_DEFERRED.has(f) ? [] : STRICT).map((v) => `${f}:${v.line} ${v.rule}: ${v.match}`),
    )
  assert.deepEqual(found, [])
})

test('the oil rule catches every banned phrase before Act 4', () => {
  for (const line of ['the oil rush', 'an Oil boom', 'the oil strike', 'oil money', 'Prudhoe Bay'])
    assert.equal(lintText(line, true)[0]?.rule, 'oil', line)
})

test('the oil rule allows plain oil, and everything from Act 4 on', () => {
  assert.deepEqual(lintText('Burn oil-soaked rags. An oilcloth bundle. Oil on the river.', true), [])
  assert.deepEqual(lintText('oil at Prudhoe Bay. The oil money arrives anyway.', false), [])
})

test('a deliberate oil rush line in Act 2 fails', () => {
  assert.deepEqual(lintText('`Everybody in town is talking about the oil rush.`', true), [
    { line: 1, rule: 'oil', match: 'oil rush' },
  ])
})

test('every literal placeholder name fails, in any act', () => {
  for (const [line, match] of [
    ['Major Dekker salutes.', 'Dekker'],
    ['Dekker', 'Dekker'],
    ['Ask Dottie.', 'Dottie'],
    ['Mrs. Vinson', 'Vinson'],
    ['Hank pours.', 'Hank'],
    ['Mr. Lyle', 'Lyle'],
    ['Officer Tom Peter', 'Tom Peter'],
    ['Uncle Ray', 'Ray'],
  ] as const)
    assert.deepEqual(lintText(line, false), [{ line: 1, rule: 'name', match }], line)
})

test('placeholder matching is whole-word and case-sensitive', () => {
  assert.deepEqual(lintText('a gray sky, an array, an x-ray, a ray of light, Raymond, Tommy, Peter', true), [])
  assert.deepEqual(lintText('a slow Hank Williams song', true), [])
  assert.deepEqual(lintText('`${N.co} and ${N.councilman}`', true), [])
})

test('violations carry their line number', () => {
  assert.deepEqual(lintText('fine\nfine\nUncle Ray', true), [{ line: 3, rule: 'name', match: 'Ray' }])
})

test('full names and a split of a full name fail; the strict set fails when asked', () => {
  for (const [line, match] of [
    ['Curly Boone comes off his stool.', 'Curly Boone'],
    ['"Vernon Barnette\'s got your name."', 'Vernon Barnette'],
  ] as const)
    assert.deepEqual(lintText(line, false), [{ line: 1, rule: 'name', match }], line)
  assert.deepEqual(lintText("${N.gossip.split(' ')[0]} pours.", false, STRICT), [{ line: 1, rule: 'name', match: ".split(' ')" }])
  assert.deepEqual(lintText('You are ${N.wade} Pruett.', false, STRICT), [{ line: 1, rule: 'name', match: 'Pruett' }])
  assert.deepEqual(lintText('${N.curly} and ${N.barnetteFull} and ${N.wade} ${N.wadeLast}', false, STRICT), [])
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spaces } from '../src/levels.ts'
import type { Sample } from '../src/probe.ts'
import { moments, poses } from '../src/probe.ts'
import type { Act } from '../../text-game/src/types.ts'
import { breaches, parseBudgets, spread, summarize, unbudgeted } from './budget.ts'

const docs = readFileSync(new URL('../../docs/perf.md', import.meta.url), 'utf8')

const sample = (space: string, over: Partial<Sample> = {}): Sample => ({
  space: space as Sample['space'],
  drawCalls: 100,
  triangles: 10000,
  textureBytes: 32e6,
  vramBytes: 40e6,
  cpuMs: 5,
  frameMs: 16,
  ...over,
})

const order = Object.keys(spaces)
// Every row docs/perf.md holds: the spaces, then the moments the probe holds still.
const budgeted = [...order, ...Object.keys(moments)]

const doc = (rows: string, download = '| Initial download | 40 |'): string =>
  [
    '# Perf',
    '',
    '| Space | Draw calls | Triangles | Texture memory (MB) |',
    '| --- | --- | --- | --- |',
    '| `elsewhere` | 1 | 1 | 1 |',
    '',
    '## Budgets',
    '',
    '| Space | Draw calls | Triangles | Texture memory (MB) |',
    '| ----- | ---------: | --------: | ------------------: |',
    rows,
    '',
    '| Download | Limit (MB) |',
    '| -------- | ---------: |',
    download,
    '',
    '## After',
    '',
    '| Space | Draw calls | Triangles | Texture memory (MB) |',
    '| --- | --- | --- | --- |',
    '| `later` | 1 | 1 | 1 |',
  ].join('\n')

test('docs/perf.md budgets every space in levels.ts, every moment the probe holds, and the download', () => {
  const b = parseBudgets(docs)
  assert.deepEqual(Object.keys(b.spaces), budgeted)
  assert.deepEqual(b.spaces.camp, { drawCalls: 1500, triangles: 1500000, textureMB: 512 })
  assert.equal(b.downloadMB, 40)
})

test('only the tables under ## Budgets count', () => {
  const b = parseBudgets(doc('| `bar` | 1,500 | 2 | 3 |'))
  assert.deepEqual(b, { spaces: { bar: { drawCalls: 1500, triangles: 2, textureMB: 3 } }, downloadMB: 40 })
})

test('a malformed budget table throws', () => {
  assert.throws(() => parseBudgets(doc('| `Bar` | 1 | 2 | 3 |')), /not a backticked space id/)
  assert.throws(() => parseBudgets(doc('| bar | 1 | 2 | 3 |')), /not a backticked space id/)
  assert.throws(() => parseBudgets(doc('| `bar` | 1 | 2 |')), /expected 4/)
  assert.throws(() => parseBudgets(doc('| `bar` | lots | 2 | 3 |')), /not a number/)
  assert.throws(() => parseBudgets(doc('| `bar` | 1 | 2 | 3 |\n| `bar` | 1 | 2 | 3 |')), /two budget rows/)
  assert.throws(() => parseBudgets(doc('| `bar` | 1 | 2 | 3 |', '| Download size | 40 |')), /Initial download/)
  assert.throws(() => parseBudgets(docs.replace('| Draw calls |', '| Calls |')), /expected a table headed/)
  assert.throws(() => parseBudgets(docs.replace('## Budgets', '## Limits')), /no ## Budgets section/)
})

test('spread takes median, 95th percentile and peak', () => {
  assert.deepEqual(spread(Array.from({ length: 20 }, (_, i) => i + 1)), { median: 11, p95: 20, max: 20 })
  assert.deepEqual(spread([3, 1, 900]), { median: 3, p95: 900, max: 900 })
  assert.deepEqual(spread([]), { median: 0, p95: 0, max: 0 })
})

test('a space fails on its peak frame, and CPU time never fails', () => {
  const b = parseBudgets(docs)
  const ok = budgeted.map((s) => sample(s, { cpuMs: 900 }))
  assert.deepEqual(breaches({ downloadMB: 3, spaces: summarize(ok, budgeted) }, b), [])
  const hot = [...ok, sample('camp', { drawCalls: 1501, triangles: 2e6, textureBytes: 600e6 })]
  assert.deepEqual(breaches({ downloadMB: 41, spaces: summarize(hot, budgeted) }, b), [
    'initial download is 41.00 MB, budget 40 MB',
    'camp: draw calls peaked at 1501, budget 1500',
    'camp: triangles peaked at 2000000, budget 1500000',
    'camp: texture memory peaked at 600 MB, budget 512 MB',
  ])
})

test('a budgeted space with no frames fails, and so does a sampled space with no budget', () => {
  const b = parseBudgets(docs)
  const failed = breaches({ downloadMB: 1, spaces: summarize([...budgeted.slice(1).map((s) => sample(s)), sample('dock')], budgeted) }, b)
  assert.deepEqual(failed, [`${order[0]}: no frames recorded`, 'dock: no budget row in docs/perf.md'])
})

// One check per act: a space that act adds to levels.ts fails here, naming the act, until docs/perf.md budgets it.
const acts: readonly Act[] = ['Prologue', 'Act 1: Flood', 'Act 2: Freeze-up', 'Act 3: Deep Winter', 'Act 4: Breakup', 'Epilogue']

acts.forEach((act) =>
  test(`every ${act} space in levels.ts has a row in docs/perf.md`, () => {
    const ids = Object.values(spaces)
      .filter((s) => s.act === act)
      .map((s) => s.id)
    assert.deepEqual(unbudgeted(parseBudgets(docs), ids), [])
  }),
)

test('every space in levels.ts has a row in docs/perf.md, the story backdrop with no act too', () => {
  assert.deepEqual(unbudgeted(parseBudgets(docs), order), [])
})

test('a space with no row is named', () => {
  const b = parseBudgets(docs.replace(/^\| `office` .*\n/m, ''))
  assert.deepEqual(unbudgeted(b, ['line', 'office', 'jail']), ['office: no budget row in docs/perf.md'])
})

test('a run that plays only some spaces fails only on those with no frames', () => {
  const b = parseBudgets(docs)
  const act1 = ['line', 'helpTent', 'cabin', 'office', 'jail']
  const some = summarize(act1.slice(1).map((s) => sample(s)), act1)
  assert.deepEqual(breaches({ downloadMB: 1, spaces: some }, b, act1), ['line: no frames recorded'])
})

test('the Pan at the barfight’s peak has its own row, held to the bar’s limits (#177)', () => {
  const b = parseBudgets(docs)
  assert.equal(poses[moments.panPeak]?.space, 'pan', 'the peak is a pose in the Pan')
  assert.deepEqual(b.spaces.panPeak, b.spaces.pan, 'at peak density the Pan holds the same budget as the Pan')
  const peak = summarize([sample('panPeak', { drawCalls: 1501 })], ['panPeak'])
  assert.deepEqual(breaches({ downloadMB: 1, spaces: peak }, b, ['panPeak']), ['panPeak: draw calls peaked at 1501, budget 1500'])
})

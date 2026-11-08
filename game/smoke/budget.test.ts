import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Sample } from '../src/probe.ts'
import { breaches, parseBudgets, spread, summarize } from './budget.ts'

const docs = readFileSync(new URL('../../docs/perf.md', import.meta.url), 'utf8')

const sample = (space: Sample['space'], over: Partial<Sample> = {}): Sample => ({
  space,
  drawCalls: 100,
  triangles: 10000,
  textureBytes: 32 * 1024 * 1024,
  vramBytes: 40 * 1024 * 1024,
  cpuMs: 5,
  frameMs: 16,
  ...over,
})

const order = ['bar', 'room', 'camp', 'flood'] as const

test('docs/perf.md budgets every space and the download', () => {
  const b = parseBudgets(docs)
  assert.deepEqual(Object.keys(b.spaces), [...order])
  assert.deepEqual(b.spaces.camp, { drawCalls: 1500, triangles: 1500000, textureMB: 512 })
  assert.equal(b.downloadMB, 40)
})

test('spread takes mean, 95th percentile and peak', () => {
  assert.deepEqual(spread(Array.from({ length: 20 }, (_, i) => i + 1)), { mean: 10.5, p95: 20, max: 20 })
  assert.deepEqual(spread([]), { mean: 0, p95: 0, max: 0 })
})

test('a space fails on its peak frame, and CPU time never fails', () => {
  const b = parseBudgets(docs)
  const ok = order.map((s) => sample(s, { cpuMs: 900 }))
  assert.deepEqual(breaches({ downloadMB: 3, spaces: summarize(ok, order) }, b), [])
  const hot = [...ok, sample('camp', { drawCalls: 1501, triangles: 2e6, textureBytes: 600 * 1024 * 1024 })]
  assert.deepEqual(breaches({ downloadMB: 41, spaces: summarize(hot, order) }, b), [
    'initial download is 41.00 MB, budget 40 MB',
    'camp: draw calls peaked at 1501, budget 1500',
    'camp: triangles peaked at 2000000, budget 1500000',
    'camp: texture memory peaked at 600 MB, budget 512 MB',
  ])
})

test('a space with no frames recorded fails', () => {
  const b = parseBudgets(docs)
  const spaces = summarize([sample('bar')], order)
  assert.ok(breaches({ downloadMB: 1, spaces }, b).includes('room: no frames recorded'))
})

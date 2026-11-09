import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { budgetFailures, budgetTable, parseBudget, type Budget } from './budget.ts'

const budget: Budget = {
  why: 'test',
  baseline: { mergedStates: 1000, peakHeapMB: 100, measured: '2026-11-08' },
  limit: { mergedStates: 2000, peakHeapMB: 200 },
}

test('a sweep inside the budget passes', () => {
  assert.deepEqual(budgetFailures({ mergedStates: 2000, peakHeapMB: 200 }, budget), [])
})

test('too many states fails with the number and points at liveness.ts', () => {
  const [msg, ...rest] = budgetFailures({ mergedStates: 2001, peakHeapMB: 10 }, budget)
  assert.equal(rest.length, 0)
  assert.match(msg, /mergedStates 2,001 exceeds the budget of 2,000/)
  assert.match(msg, /src\/liveness\.ts/)
})

test('too much heap fails on its own', () => {
  const failures = budgetFailures({ mergedStates: 10, peakHeapMB: 201 }, budget)
  assert.equal(failures.length, 1)
  assert.match(failures[0], /peakHeapMB 201 exceeds the budget of 200/)
})

test('the table shows growth since the baseline and the share of the budget used', () => {
  const table = budgetTable({ mergedStates: 1500, peakHeapMB: 90 }, budget)
  assert.match(table, /\| mergedStates \| 1,000 \| 1,500 \| \+50% \| 2,000 \| 75% \|/)
  assert.match(table, /\| peakHeapMB \| 100 \| 90 \| -10% \| 200 \| 45% \|/)
})

test('a budget missing a limit is rejected', () => {
  assert.throws(() => parseBudget(JSON.stringify({ baseline: budget.baseline, limit: { mergedStates: 1 } })), /peakHeapMB/)
})

test('the committed budget parses and leaves headroom over its baseline', () => {
  const committed = parseBudget(readFileSync(new URL('../explore-budget.json', import.meta.url), 'utf8'))
  assert.deepEqual(budgetFailures(committed.baseline, committed), [])
})

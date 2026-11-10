import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { render, replay } from './engine.ts'
import { ending } from './logic.ts'
import { missions } from './missions.ts'
import { missionNotes, reachedNotes } from './missionCover.ts'

type Golden = Readonly<{ path: string; ending: string; transcript: string }>

const routes = new URL('../routes/', import.meta.url)

const golden: readonly Golden[] = JSON.parse(readFileSync(new URL('golden.json', routes), 'utf8'))

test('golden routes exist for every ending', () => {
  assert.deepEqual([...new Set(golden.map((g) => g.ending))].sort(), ['bad', 'best', 'good', 'middle'])
})

golden.forEach((g) => {
  test(`golden ${g.transcript} replays to the same ending and full transcript`, () => {
    const states = replay(g.path.split(',').map(Number))
    assert.equal(ending(states[states.length - 1]), g.ending, g.path)
    assert.equal(states.map(render).join('\n\n') + '\n', readFileSync(new URL(g.transcript, routes), 'utf8'), g.path)
  })
})

test('every mission note is reached by at least one golden route', () => {
  const reached = new Set(golden.flatMap((g) => [...reachedNotes(g.path)]))
  assert.deepEqual(missionNotes.filter((n) => !reached.has(n)), [], 'mission notes no golden route plays')
})

test('the golden set stays a greedy cover: no more routes than the matrix\'s per-value routes plus the busiest mission', () => {
  const busiest = Math.max(...missions.map((m) => m.endings.length))
  assert.ok(golden.length <= 25 + busiest, `${golden.length} golden routes`)
})

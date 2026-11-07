import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { render, replay } from './engine.ts'
import { ending } from './logic.ts'

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

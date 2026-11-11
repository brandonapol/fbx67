import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// `npm test` names the smoke folder's headless tests one by one (the rest of the folder drives a browser and runs
// under the `smoke` scripts), so a new headless test file there runs only once someone lists it. This holds every
// smoke test file to one script or the other: a test file nothing runs is a test that cannot fail.

const root = fileURLToPath(new URL('..', import.meta.url))
const scripts: Readonly<Record<string, string>> = JSON.parse(readFileSync(`${root}package.json`, 'utf8')).scripts

const named = (script: string): readonly string[] => script.split(/\s+/).filter((w) => w.startsWith('smoke/'))

test('every smoke test file runs: headless under npm test, or as a browser run under a smoke script', () => {
  const run = new Set(Object.entries(scripts).flatMap(([name, s]) => (name === 'test' || name.startsWith('smoke') ? named(s) : [])))
  const files = readdirSync(`${root}smoke`).filter((f) => f.endsWith('.test.ts')).map((f) => `smoke/${f}`)
  assert.ok(files.length > 0)
  assert.deepEqual(files.filter((f) => !run.has(f)), [], 'listed in no script')
})

test('the listed smoke test files exist', () => {
  const files = new Set(readdirSync(`${root}smoke`).map((f) => `smoke/${f}`))
  const listed = Object.values(scripts).flatMap(named)
  assert.deepEqual(listed.filter((f) => !files.has(f)), [])
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

// Playwright's screenshot timeout defaults to 30 s, which a slow runner under SwiftShader can pass in the camp
// (#459). The timeouts can't be exercised without a slow runner, so this holds the rule on the source: every
// screenshot call in the smoke files names a timeout of at least 120 s.

const MIN_MS = 120000
const dir = new URL('.', import.meta.url)

test('every screenshot call in the smoke files passes an explicit timeout of at least 120 s', () => {
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'screenshotTimeout.test.ts')
  const calls = files.flatMap((f) =>
    [...readFileSync(new URL(f, dir), 'utf8').matchAll(/\.screenshot\(([^)]*)\)/g)].map((m) => ({ f, args: m[1]! })),
  )
  assert.ok(calls.length > 0, 'found no screenshot calls')
  calls.forEach(({ f, args }) => {
    const t = /timeout:\s*(\d+)/.exec(args)
    assert.ok(t && Number(t[1]) >= MIN_MS, `${f}: screenshot(${args}) needs timeout >= ${MIN_MS}`)
  })
})

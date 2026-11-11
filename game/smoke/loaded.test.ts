import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LOAD_MS, waitLoaded } from './loaded.ts'

// A page that answers waitForFunction with a fixed value, recording the timeout it was given.
const pageSaying = (value: string, seen: { timeout?: number } = {}) => ({
  waitForFunction: async (_f: unknown, _arg: unknown, opts: { timeout: number }) => {
    seen.timeout = opts.timeout
    return { jsonValue: async () => value }
  },
})

// #62: the smoke run waited on the game with Playwright's default timeout, and a failed load only timed out.
test('the smoke run waits for the game with an explicit timeout', async () => {
  const seen: { timeout?: number } = {}
  await waitLoaded(pageSaying('ok', seen))
  assert.equal(seen.timeout, LOAD_MS)
})

test('a load the page reports as failed fails the smoke run with its message', async () => {
  await assert.rejects(waitLoaded(pageSaying('The game could not load: 404 fetching owen.glb.')), /404 fetching owen\.glb/)
})

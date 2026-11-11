import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { cachedFetcher } from './fetchCache.ts'

const dir = { path: '' }
beforeEach(async () => {
  dir.path = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'fetch-cache-'))
})
afterEach(() => rm(dir.path, { recursive: true, force: true }))

const body = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])

// A fetch that counts its calls and answers after a tick, so concurrent callers overlap.
const fakeFetch = (bytes: Uint8Array, contentLength: string | undefined = String(bytes.length)) => {
  const calls = { n: 0 }
  const impl = async (): Promise<Response> => {
    calls.n += 1
    await new Promise((r) => setTimeout(r, 5))
    const headers = contentLength === undefined ? undefined : { 'content-length': contentLength }
    return new Response(bytes, { headers })
  }
  return { calls, impl }
}

test('concurrent callers for one cache file share a single download', async () => {
  const f = fakeFetch(body)
  const fetchTo = cachedFetcher(f.impl)
  const path = join(dir.path, 'clips', 'walk.glb')
  const got = await Promise.all([1, 2, 3, 4].map(() => fetchTo('https://x/walk.glb', path)))
  assert.deepEqual(got, [path, path, path, path])
  assert.equal(f.calls.n, 1)
  assert.deepEqual(new Uint8Array(await readFile(path)), body)
})

test('a file already in the cache is not fetched again', async () => {
  const f = fakeFetch(body)
  const path = join(dir.path, 'idle.glb')
  await writeFile(path, body)
  assert.equal(await cachedFetcher(f.impl)('https://x/idle.glb', path), path)
  assert.equal(f.calls.n, 0)
})

test('a body shorter than Content-Length fails and leaves nothing in the cache', async () => {
  const f = fakeFetch(body, '64')
  const path = join(dir.path, 'run.glb')
  await assert.rejects(cachedFetcher(f.impl)('https://x/run.glb', path), /8 of 64 bytes/)
  assert.deepEqual(await readdir(dir.path), [])
})

test('a failed download can be retried by the same fetcher', async () => {
  const bad = { first: true }
  const impl = async (): Promise<Response> => {
    if (bad.first) {
      bad.first = false
      return new Response('gone', { status: 503 })
    }
    return new Response(body)
  }
  const fetchTo = cachedFetcher(impl)
  const path = join(dir.path, 'jog.glb')
  await assert.rejects(fetchTo('https://x/jog.glb', path), /503/)
  assert.equal(await fetchTo('https://x/jog.glb', path), path)
  assert.deepEqual(new Uint8Array(await readFile(path)), body)
})

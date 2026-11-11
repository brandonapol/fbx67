import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { castIds, clipIds, clipUrl, modelUrl } from './cast.ts'

// characters.ts (loadCast, spawn, play) is all PlayCanvas assets and entities, so it is not run here. What it
// consumes is data: every cast member loads one model and one clip per clip id, from the urls cast.ts builds. A
// missing file would fail the whole cast load at startup, so the files are checked on disk.

const PUBLIC = new URL('../public/', import.meta.url)
const onDisk = (url: string): boolean => existsSync(new URL(url.replace(/^\//, ''), PUBLIC))

test('every cast member has a model and every clip file the loader asks for', () => {
  castIds.forEach((who) => {
    assert.ok(onDisk(modelUrl('/', who)), modelUrl('/', who))
    clipIds.forEach((clip) => assert.ok(onDisk(clipUrl('/', who, clip)), clipUrl('/', who, clip)))
  })
})

test('model and clip urls are unique, so no two loads share an asset', () => {
  const urls = castIds.flatMap((who) => [modelUrl('/', who), ...clipIds.map((c) => clipUrl('/', who, c))])
  assert.equal(new Set(urls).size, castIds.length * (clipIds.length + 1))
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { N } from './names.ts'

// Scenes use the short and full forms side by side; a rename of one must carry to the other.
test('every short name is the first word of its full name', () => {
  const pairs: readonly (readonly [string, string])[] = [
    [N.owenShort, N.owen],
    [N.curlyShort, N.curly],
    [N.gossipShort, N.gossip],
    [N.bartenderShort, N.bartender],
    [N.tolliverFirst, N.tolliver],
  ]
  pairs.forEach(([short, full]) => assert.equal(full.split(' ')[0], short, full))
})

test('the titled names carry the full name they title', () => {
  assert.equal(N.tolliver, `${N.tolliverFirst} ${N.tolliverLast}`)
  assert.ok(N.councilman.endsWith(` ${N.tolliver}`), N.councilman)
  assert.ok(N.barnette.endsWith(` ${N.barnetteFull}`), N.barnette)
})
